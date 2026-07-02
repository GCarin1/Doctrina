import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { exists, isDir, isFile, read, relPath, walk } from "../lib/fs-ops.js";
import { listHeader } from "../lib/scan.js";
import { parseFrontmatter } from "./skill.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";

// Materialise the AGENTS.md read order as a command: print the exact
// context pack for a task, in the order an agent should read it. This is
// the context-engineering thesis turned into tooling — selection over
// dumping, ranked by the documented read order.
//
// The pack now carries a token estimate per file (chars/4 — the standard
// rough heuristic; the thesis the product is built on is that token spend
// predicts performance, so the pack must be measurable in tokens, not only
// lines). `--budget <n>` turns the estimate into a gate, and `--diff <ref>`
// scopes the pack to what changed since a git ref — the resume-session read.

const TOKEN_DIVISOR = 4;

export async function run(positional, flags) {
  const capability = positional[0] ?? null;
  const concat = flagBool(flags, "concat", false);
  const budgetRaw = flagString(flags, "budget");
  const diffRef = flagString(flags, "diff");
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  if (capability && !/^[a-z][a-z0-9-]*$/.test(capability)) {
    console.error(c.red("error:") + ` invalid capability "${capability}" (lowercase letters, digits, hyphens)`);
    return 2;
  }

  let budget = null;
  if (budgetRaw !== undefined) {
    budget = Number.parseInt(budgetRaw, 10);
    if (!Number.isFinite(budget) || budget <= 0) {
      console.error(c.red("error:") + ` --budget expects a positive token count, got "${budgetRaw}"`);
      return 2;
    }
  }

  // --diff <ref>: restrict the stable artifacts to those changed since the
  // ref (a resuming session already carries the rest); open changes are
  // always in — they ARE the work being resumed.
  let changed = null;
  if (diffRef !== undefined) {
    changed = changedPaths(projectRoot, diffRef);
    if (changed === null) return 1; // changedPaths printed the error
  }
  // git emits POSIX paths; relPath emits native separators on Windows.
  const wanted = (rel) => changed === null || changed.has(rel.replaceAll("\\", "/"));

  const pack = [];
  const pushFile = (rel, note) => {
    const full = path.join(projectRoot, rel);
    if (!isFile(full)) return;
    const text = read(full);
    pack.push({ rel, lines: text.split(/\r?\n/).length, tokens: Math.round(text.length / TOKEN_DIVISOR), note });
  };

  // 1-2. Root rules and product truth — always first. Displayed paths are
  // POSIX strings (path.join would emit backslashes on Windows).
  if (wanted("AGENTS.md")) pushFile("AGENTS.md", "root rules");
  if (wanted(".doctrina/product.md")) pushFile(".doctrina/product.md", "product truth");

  // 3. The capability spec(s) — the current truth. With a named capability,
  //    just that one. Without one, EVERY active spec: the default orientation
  //    read previously jumped from product.md straight to the ADRs, leaving
  //    the single source of truth out of the pack entirely. Specs come before
  //    open changes and ADRs, matching the documented read order.
  let specMissing = false;
  const specsRoot = path.join(projectRoot, ".doctrina", "specs");
  if (capability) {
    const specRel = `.doctrina/specs/${capability}/spec.md`;
    if (isFile(path.join(projectRoot, specRel))) {
      pushFile(specRel, `spec: ${capability}`);
    } else {
      specMissing = true;
    }
  } else if (isDir(specsRoot)) {
    for (const cap of readdirSync(specsRoot).sort()) {
      const specRel = `.doctrina/specs/${cap}/spec.md`;
      if (wanted(specRel) && isFile(path.join(projectRoot, specRel))) pushFile(specRel, `spec: ${cap}`);
    }
  }

  // 4. Open changes (their proposal, tasks, and deltas) — never diff-filtered.
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  if (isDir(changesDir)) {
    for (const id of readdirSync(changesDir).sort()) {
      if (id === "archive" || id.startsWith(".")) continue;
      if (!isDir(path.join(changesDir, id))) continue;
      for (const f of walk(path.join(changesDir, id))) {
        if (!f.endsWith(".md")) continue;
        pushFile(relPath(projectRoot, f), `open change: ${id}`);
      }
    }
  }

  // 5. Accepted ADRs only — superseded/withdrawn stay out of the pack.
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  for (const f of walk(adrDir)) {
    if (!f.endsWith(".md")) continue;
    const rel = relPath(projectRoot, f);
    if (!wanted(rel)) continue;
    const status = (listHeader(read(f), "Status") ?? "").toLowerCase();
    if (status === "accepted") pushFile(rel, "accepted ADR");
  }

  // 6. Skills are on-demand: list name + description + trigger, never the
  //    body. The `when:` line is what lets an agent fire the right skill
  //    without loading any of them.
  const onDemand = [];
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  for (const f of walk(skillsDir)) {
    if (!f.endsWith(".md")) continue;
    const text = read(f);
    onDemand.push({
      rel: relPath(projectRoot, f),
      name: parseFrontmatter(text, "name") ?? path.basename(f, ".md"),
      description: parseFrontmatter(text, "description") ?? "<missing description>",
      when: parseFrontmatter(text, "when") ?? null,
    });
  }

  const totalTokens = pack.reduce((sum, item) => sum + item.tokens, 0);
  const totalLines = pack.reduce((sum, item) => sum + item.lines, 0);

  if (concat) {
    for (const item of pack) {
      console.log(`===== ${item.rel} (${item.note}) =====`);
      console.log("");
      console.log(read(path.join(projectRoot, item.rel)).trimEnd());
      console.log("");
    }
    // Keep the pack pipeable: the budget verdict goes to stderr.
    if (budget !== null) {
      reportBudget(totalTokens, budget, (msg) => console.error(msg));
    }
  } else {
    const scope = diffRef !== undefined ? c.gray(` (diff vs ${diffRef})`) : "";
    console.log(c.bold("Context pack") + (capability ? c.gray(` (capability: ${capability})`) : "") + scope + c.gray(" — read in this order:"));
    console.log("");
    pack.forEach((item, i) => {
      console.log(`${i + 1}. ${c.cyan(item.rel.padEnd(56))} ${String(item.lines).padStart(4)} lines ${c.gray(`~${String(item.tokens).padStart(5)} tok`)}  ${c.gray(item.note)}`);
    });
    console.log("");
    console.log(c.gray(`${pack.length} files, ${totalLines} lines, ~${totalTokens} tokens total (chars/4) · archive excluded by design`));
    if (budget !== null) reportBudget(totalTokens, budget, (msg) => console.log(msg));
    if (onDemand.length > 0) {
      console.log("");
      console.log(c.bold("On-demand skills") + c.gray(" (load the body only when the trigger fires):"));
      for (const s of onDemand) {
        console.log(`   ${c.cyan(s.name.padEnd(26))} ${s.description}`);
        if (s.when) console.log(`   ${" ".repeat(26)} ${c.gray(`when: ${s.when}`)}`);
      }
    }
  }

  if (specMissing) {
    console.error("");
    console.error(c.yellow("warn:") + ` no spec for capability "${capability}" — create one with \`doctrina spec new ${capability}\``);
  }
  if (budget !== null && totalTokens > budget) return 1;
  return 0;
}

function reportBudget(totalTokens, budget, log) {
  if (totalTokens > budget) {
    log(c.red("over budget") + ` ~${totalTokens} tokens > ${budget} — narrow the pack: name a capability, use --diff <ref>, split oversized specs`);
  } else {
    log(c.green("within budget") + c.gray(` ~${totalTokens} of ${budget} tokens (${Math.round((totalTokens / budget) * 100)}%)`));
  }
}

// Repo-relative POSIX paths changed since <ref> (worktree vs ref, plus
// untracked files). Returns null (after printing the error) when git or the
// ref is unavailable — the caller exits rather than silently showing a full
// pack the user asked to narrow.
function changedPaths(projectRoot, ref) {
  const run = (args) => spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
  const diff = run(["diff", "--name-only", ref, "--"]);
  if (diff.status !== 0) {
    console.error(c.red("error:") + ` git diff against "${ref}" failed${diff.stderr ? `: ${diff.stderr.trim().split("\n")[0]}` : " (not a git repository?)"}`);
    return null;
  }
  const untracked = run(["ls-files", "--others", "--exclude-standard"]);
  const out = new Set();
  for (const chunk of [diff.stdout, untracked.status === 0 ? untracked.stdout : ""]) {
    for (const line of chunk.split(/\r?\n/)) {
      const p = line.trim();
      if (p) out.add(p);
    }
  }
  return out;
}

export const help = `
Usage: doctrina context [<capability>] [--concat] [--budget <tokens>] [--diff <ref>]

Print the exact context pack for a task, in the documented read
order: AGENTS.md, product.md, the capability spec (when given —
otherwise every active spec), open changes, accepted ADRs. Skills are
listed name + description + when-trigger only — they are on-demand by
design. The change archive is excluded. Every file carries a token
estimate (chars/4) and the pack reports its total.

Flags:
  --concat          Print the file contents (with separators) instead of
                    the list — ready to pipe into an agent. The budget
                    verdict (if any) goes to stderr, keeping stdout pure.
  --budget <n>      Token budget for the pack: prints over/under and
                    exits 1 when the estimate exceeds it (a context gate).
  --diff <ref>      Scope the stable artifacts (AGENTS.md, product.md,
                    specs, ADRs) to those changed since the git ref; open
                    changes are always included. The resume-session read.

Read-only; exits 0 (or 1 when over --budget).
`;

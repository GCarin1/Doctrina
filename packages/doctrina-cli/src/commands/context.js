// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { exists, isDir, isFile, read, relPath, walk } from "../lib/fs-ops.js";
import { listHeader, parseDependsOn, parseAdrScope, adrSummary } from "../lib/scan.js";
import { getTitle, getSectionParagraph } from "../lib/doc-model.js";
import { parseFrontmatter } from "./skill.js";
import { flagBool, flagString, flagGivenWithoutValue } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { GIT_STATE, historyState } from "../lib/git.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import * as idx from "../lib/index-json.js";

// Materialise the AGENTS.md read order as a command: print the exact
// context pack for a task, in the order an agent should read it. This is
// the context-engineering thesis turned into tooling — selection over
// dumping, ranked by the documented read order.
//
// Context assembly is RETRIEVAL, not a dump (ADR 0022). A pack that grows
// with the project's age rather than with the task at hand stops being a
// context pack and becomes the corpus. Three mechanisms keep it bounded:
//
//   1. SCOPE   — an ADR declaring `- **Scope:** <cap>` joins only the packs
//                for those capabilities. Unscoped means global, which is
//                also the backward-compatible default.
//   2. BUDGET  — a token ceiling always applies (flag > index.json config >
//                DEFAULT_BUDGET). The pack is assembled to FIT it.
//   3. DEGRADE — over budget, ADRs fall back to title + summary before
//                anything is dropped, least-relevant first. A decision
//                reduced to one sentence still carries the decision; an
//                omitted one carries nothing.
//
// `--for "<task>"` makes the ordering query-driven, so what survives the
// budget is what the task is about. `--diff <ref>` scopes the pack to what
// changed since a git ref — the resume-session read.

const TOKEN_DIVISOR = 4;

// The ceiling a pack is assembled to when the project has not set one.
// Override per project with `"config": { "context_budget": <n> }` in
// .doctrina/index.json, or per call with `--budget`.
export const DEFAULT_BUDGET = 15000;

// Tiers, worst-first in the degradation ladder. The CORE is the pack's
// irreducible minimum: the rules, the product truth, the named capability's
// spec, and the work in flight. It is never degraded and never dropped — if
// it alone exceeds the budget, that is a finding, not something to hide.
const TIER = { CORE: 0, SPEC: 1, DEPENDENCY: 2, DECISION: 3 };

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "concat"], string: ["budget", "diff", "for"] };

export async function run(positional, cmdFlags) {
  const capability = positional[0] ?? null;
  const concat = flagBool(cmdFlags, "concat", false);
  const budgetRaw = flagString(cmdFlags, "budget");
  const diffRef = flagString(cmdFlags, "diff");
  const query = flagString(cmdFlags, "for");
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  if (capability && !/^[a-z][a-z0-9-]*$/.test(capability)) {
    console.error(c.red("error:") + ` invalid capability "${capability}" (lowercase letters, digits, hyphens)`);
    return 2;
  }

  // A value-taking flag written without a value is a usage error, not a
  // silent fall-back to the default — `--budget -100` reaches here as
  // "budget given, value unreadable", and quietly using the default would
  // hide the typo behind a pack that looks fine.
  for (const name of ["budget", "diff", "for"]) {
    if (flagGivenWithoutValue(cmdFlags, name)) {
      console.error(c.red("error:") + ` --${name} needs a value`);
      return 2;
    }
  }

  const budget = resolveBudget(projectRoot, budgetRaw);
  if (budget === null) {
    console.error(c.red("error:") + ` --budget expects a positive token count, got "${budgetRaw}"`);
    return 2;
  }

  const terms = queryTerms(query);
  if (query !== undefined && terms.length === 0) {
    console.error(c.red("error:") + " --for needs at least one word to retrieve on");
    return 2;
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
  const pushFile = (rel, note, extra = {}) => {
    const full = path.join(projectRoot, rel);
    if (!isFile(full)) return null;
    const text = read(full);
    const item = {
      rel,
      lines: text.split(/\r?\n/).length,
      tokens: estimateTokens(text),
      fullTokens: estimateTokens(text),
      note,
      tier: TIER.CORE,
      rank: [],
      degraded: false,
      ...extra,
    };
    pack.push(item);
    return item;
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
  //
  //    With --for and no named capability, the specs are RANKED by the query
  //    and become degradable: retrieval is what decides which truths this
  //    task needs, and the budget is what enforces the decision.
  let specMissing = false;
  const specsRoot = path.join(projectRoot, ".doctrina", "specs");
  const dependencies = new Set();
  if (capability) {
    const specRel = `.doctrina/specs/${capability}/spec.md`;
    if (isFile(path.join(projectRoot, specRel))) {
      pushFile(specRel, `spec: ${capability}`);
      // Pull the declared dependencies into the pack (the machine-readable
      // **Depends on:** header): a task on `risk-map` that builds on
      // `reporting` needs both truths in one read. One level deep,
      // deterministic, no cycles (each spec is pushed at most once).
      for (const dep of parseDependsOn(read(path.join(projectRoot, specRel)))) {
        if (dep === capability) continue;
        const depRel = `.doctrina/specs/${dep}/spec.md`;
        if (isFile(path.join(projectRoot, depRel))) {
          dependencies.add(dep);
          pushFile(depRel, `dependency of ${capability}`, { tier: TIER.DEPENDENCY });
        }
      }
    } else {
      specMissing = true;
    }
  } else if (isDir(specsRoot)) {
    // No capability named: this is the orientation read, and it cannot
    // hold every spec in full on a project of any size. Specs are
    // SUMMARISABLE here — title + purpose — so the pack degrades into a
    // map of what the capabilities are and what each is for. Naming one
    // is how you ask for its truth in full. That is the whole thesis:
    // without a task there is nothing to retrieve ON, so the honest
    // answer is an index, not a dump.
    for (const cap of readdirSync(specsRoot).sort()) {
      const specRel = `.doctrina/specs/${cap}/spec.md`;
      const full = path.join(projectRoot, specRel);
      if (!wanted(specRel) || !isFile(full)) continue;
      const text = read(full);
      pushFile(specRel, `spec: ${cap}`, {
        tier: TIER.SPEC,
        rank: relevance(text, terms, `${cap} ${getTitle(text) ?? ""}`),
        title: getTitle(text) ?? cap,
        summary: sectionSummary(text, "Purpose"),
      });
    }
  }

  // 4. Open changes (their proposal, tasks, and deltas) — never diff-filtered,
  //    never degraded. Work in flight is the one thing a resuming agent
  //    cannot reconstruct from anywhere else.
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

  // 5. Accepted ADRs — superseded and withdrawn stay out of the pack, and
  //    a SCOPED ADR joins only the packs of the capabilities it governs.
  //    Without scoping, every accepted decision loads into every pack
  //    forever: ADRs are immutable and never retire, so the pack grows
  //    with the project's age and nothing ever decays out of it.
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  for (const f of walk(adrDir)) {
    if (!f.endsWith(".md")) continue;
    const rel = relPath(projectRoot, f);
    if (!wanted(rel)) continue;
    const text = read(f);
    if ((listHeader(text, "Status") ?? "").toLowerCase() !== "accepted") continue;

    const scope = parseAdrScope(text);
    // An unscoped ADR is global by definition — it belongs in every pack.
    // That is what makes scoping opt-in and backward compatible.
    const global = scope.length === 0;
    const governs = capability !== null
      && (scope.includes(capability) || scope.some((s) => dependencies.has(s)));
    if (capability !== null && !global && !governs) continue;

    const id = path.basename(f).match(/^(\d{4})-/)?.[1] ?? "0000";
    const title = getTitle(text) ?? path.basename(f, ".md");
    pushFile(rel, global ? "accepted ADR" : `accepted ADR (${scope.join(", ")})`, {
      tier: TIER.DECISION,
      // Best-first, deterministic: an ADR that explicitly governs this
      // capability outranks a merely global one; then query relevance;
      // then the number, so the newer decision survives the longer.
      rank: [governs ? 1 : 0, ...relevance(text, terms, title), Number.parseInt(id, 10)],
      adrId: id,
      title,
      summary: adrSummary(text),
    });
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

  // Fit the pack to the budget. This mutates items in place (degrading) and
  // returns what it had to give up, so the report can name it.
  const fit = fitToBudget(pack, budget, capability);
  const kept = pack.filter((item) => !item.dropped);
  const totalTokens = kept.reduce((sum, item) => sum + item.tokens, 0);
  const totalLines = kept.reduce((sum, item) => sum + item.lines, 0);

  if (concat) {
    for (const item of kept) {
      console.log(`===== ${item.rel} (${item.note}) =====`);
      console.log("");
      console.log(item.degraded ? degradedBody(item) : read(path.join(projectRoot, item.rel)).trimEnd());
      console.log("");
    }
    // Keep the pack pipeable: the budget verdict goes to stderr.
    reportBudget(totalTokens, budget, fit, (msg) => console.error(msg));
  } else {
    const scope = diffRef !== undefined ? c.gray(` (diff vs ${diffRef})`) : "";
    const forNote = terms.length > 0 ? c.gray(` (for: ${terms.join(" ")})`) : "";
    console.log(c.bold("Context pack") + (capability ? c.gray(` (capability: ${capability})`) : "") + forNote + scope + c.gray(" — read in this order:"));
    console.log("");
    kept.forEach((item, i) => {
      const mark = item.degraded ? c.yellow(" summary") : "        ";
      console.log(`${String(i + 1).padStart(2)}. ${c.cyan(item.rel.padEnd(56))} ${String(item.lines).padStart(4)} lines ${c.gray(`~${String(item.tokens).padStart(5)} tok`)}${mark}  ${c.gray(item.note)}`);
    });
    console.log("");
    console.log(c.gray(`${kept.length} files, ${totalLines} lines, ~${totalTokens} tokens total (chars/4) · archive excluded by design`));
    reportBudget(totalTokens, budget, fit, (msg) => console.log(msg));
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
  // The pack fits, or the command says so. It never silently exceeds.
  return fit.overflowed ? 1 : 0;
}

function estimateTokens(text) {
  return Math.round(text.length / TOKEN_DIVISOR);
}

// Flag beats project config beats the built-in default. Returns null for a
// malformed --budget so the caller can report a usage error.
function resolveBudget(projectRoot, budgetRaw) {
  if (budgetRaw !== undefined) {
    const n = Number.parseInt(budgetRaw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  try {
    const configured = idx.load(projectRoot)?.config?.context_budget;
    if (Number.isFinite(configured) && configured > 0) return configured;
  } catch {
    // An unreadable index is `validate`'s problem, not a reason to refuse
    // to assemble a pack.
  }
  return DEFAULT_BUDGET;
}

// What an artifact reduces to when the budget cannot hold its body: the
// title, the gist in a sentence or two, and the path to read when that is
// not enough. A decision in one sentence still carries the decision; an
// omitted one carries nothing.
function degradedBody(item) {
  const lines = [`# ${item.title ?? item.rel}`, ""];
  if (item.summary) lines.push(item.summary, "");
  lines.push(`(summarised to fit the context budget — full text: ${item.rel})`);
  return lines.join("\n");
}

// The opening paragraph of a named section, flattened to one line. This is
// a spec's Purpose: enough to know whether this capability is the one the
// task is about, which is all an orientation read owes you.
function sectionSummary(text, section, cap = 400) {
  const body = getSectionParagraph(text, section);
  if (!body) return null;
  return body.length > cap ? body.slice(0, cap - 3).trimEnd() + "..." : body;
}

// Assemble the pack down to the budget. Deterministic and tested: ADRs
// degrade to title + summary before anything is dropped, dropped before any
// spec is, and the core is never touched. Best-first throughout — the
// least relevant artifact is always the next one to give something up.
export function fitToBudget(pack, budget, capability = null) {
  const summarised = [];
  const dropped = [];
  const total = () => pack.reduce((sum, i) => sum + (i.dropped ? 0 : i.tokens), 0);

  // Worst-first within a tier: lowest relevance goes first, path breaking
  // ties so two runs over the same tree always give the same pack.
  const worstFirst = (tier) => pack
    .filter((i) => i.tier === tier && !i.dropped)
    .sort((a, b) => compareRank(a.rank ?? [], b.rank ?? []) || (a.rel < b.rel ? -1 : 1));

  const degrade = (item) => {
    if (item.degraded || !item.summary) return;
    const body = degradedBody(item);
    item.degraded = true;
    item.tokens = estimateTokens(body);
    item.lines = body.split("\n").length;
    summarised.push(item);
  };
  const drop = (item) => {
    item.dropped = true;
    dropped.push(item);
  };

  // The ladder, rung by rung. EVERY degradation precedes ANY drop: a
  // decision reduced to one sentence still carries the decision, so
  // summarising the whole corpus costs less than deleting any of it. The
  // first ordering here dropped all twenty ADRs to keep seven specs whole,
  // then had to summarise the specs anyway — the worst of both.
  /** @type {Array<[number, (item: PackItem) => void]>} */
  const ladder = [
    [TIER.DECISION, degrade],   // 1. every decision to title + summary
    [TIER.SPEC, degrade],       // 2. every unnamed capability to title + purpose
    [TIER.DECISION, drop],      // 3. only now, let decisions go
    [TIER.DEPENDENCY, drop],    // 4. then dependency specs (never the named one)
  ];
  for (const [tier, apply] of ladder) {
    for (const item of worstFirst(tier)) {
      if (total() <= budget) break;
      apply(item);
    }
  }

  return { summarised, dropped, overflowed: total() > budget, budget, used: total(), capability };
}

function reportBudget(totalTokens, budget, fit, log) {
  const pct = Math.round((totalTokens / budget) * 100);
  if (fit.overflowed) {
    log(c.red("over budget") + ` ~${totalTokens} tokens > ${budget}, and nothing further can be given up`);
    log(c.gray("The pack's core — root rules, product truth, the capability spec, open changes —"));
    log(c.gray("exceeds the budget on its own. Split an oversized spec, close a stale change, or"));
    log(c.gray("raise the ceiling: ") + c.cyan(`doctrina context --budget ${Math.ceil(totalTokens / 1000) * 1000}`));
    return;
  }
  if (fit.summarised.length === 0 && fit.dropped.length === 0) {
    log(c.green("within budget") + c.gray(` ~${totalTokens} of ${budget} tokens (${pct}%)`));
    return;
  }
  log(c.green("within budget") + c.gray(` ~${totalTokens} of ${budget} tokens (${pct}%) after assembly:`));
  const adrs = fit.summarised.filter((i) => i.adrId);
  const specs = fit.summarised.filter((i) => !i.adrId);
  if (adrs.length > 0) {
    log(c.gray(`  ${adrs.length} ADR${adrs.length === 1 ? "" : "s"} reduced to title + summary (least relevant first)`));
  }
  if (specs.length > 0) {
    log(c.gray(`  ${specs.length} spec${specs.length === 1 ? "" : "s"} reduced to title + purpose — name one to read it in full`));
  }
  if (fit.dropped.length > 0) {
    log(c.gray(`  ${fit.dropped.length} omitted: `) + fit.dropped.map((i) => i.adrId ?? path.basename(path.dirname(i.rel))).join(", "));
  }
  // Only worth saying where scoping can act: an unnamed pack carries every
  // ADR by definition, so there is nothing for a scope to exclude.
  if (fit.capability && adrs.length > 0) {
    log(c.gray("  scope an ADR to shrink this permanently: ") + c.cyan("doctrina decision scope --write"));
  }
}

// Content words in a --for query. Deliberately tiny: the stop list covers
// the connective tissue of an English task description, nothing domain-
// specific, so retrieval never quietly discards a real term.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "for",
  "from", "has", "have", "how", "i", "if", "in", "into", "is", "it", "its",
  "of", "on", "or", "should", "that", "the", "then", "this", "to", "up",
  "was", "we", "what", "when", "where", "which", "why", "will", "with",
]);

export function queryTerms(query) {
  if (query === undefined || query === null) return [];
  return [...new Set(
    String(query).toLowerCase().match(/[a-z][a-z0-9-]{1,}/g)?.filter((w) => !STOPWORDS.has(w)) ?? [],
  )];
}

// How strongly a document answers the query, as a comparable tuple rather
// than one blended number — so the tiebreak order is readable and no
// weighting constant has to be guessed:
//
//   [ terms in the title/id, terms in the body, hits per 1000 chars ]
//
// Density, not raw hit count, breaks the final tie. Raw hits reward a
// document for being long: the 473-line `cli` spec out-scored `skills` on
// the query "write a skill from git history" purely on volume, which is
// the length bias that makes naive retrieval useless on a mature tree.
export function relevance(text, terms, emphasis = "") {
  if (terms.length === 0) return [0, 0, 0];
  const hay = text.toLowerCase();
  const head = emphasis.toLowerCase();
  let inTitle = 0;
  let inBody = 0;
  let hits = 0;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundary = `(^|[^a-z0-9-])${escaped}`;
    const n = (hay.match(new RegExp(boundary, "g")) ?? []).length;
    if (n > 0) {
      inBody += 1;
      hits += n;
    }
    if (new RegExp(boundary).test(head)) inTitle += 1;
  }
  return [inTitle, inBody, Math.round((hits * 1000) / Math.max(text.length, 1))];
}

// Ascending comparison of two rank tuples, shorter-is-smaller on a prefix.
// Ties are broken by the caller (on path), so two runs over the same tree
// always produce the same pack — the determinism the ladder promises.
export function compareRank(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

// Repo-relative POSIX paths changed since <ref> (worktree vs ref, plus
// untracked files). Returns null (after printing the error) when git or the
// ref is unavailable — the caller exits rather than silently showing a full
// pack the user asked to narrow.
function changedPaths(projectRoot, ref) {
  // Explain the first-run states in the user's terms rather than leaking
  // git plumbing ("fatal: bad revision 'HEAD'") — audit item C8.
  const history = historyState(projectRoot);
  if (!history.usable) {
    console.error(c.red("error:") + ` cannot diff against "${ref}" — ${history.reason}`);
    if (history.state === GIT_STATE.EMPTY) {
      console.error(c.gray("hint: ") + "make a commit first, or drop --diff for the full pack");
    }
    return null;
  }
  const run = (args) => spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
  const diff = run(["diff", "--name-only", ref, "--"]);
  if (diff.status !== 0) {
    console.error(c.red("error:") + ` git diff against "${ref}" failed${diff.stderr ? `: ${diff.stderr.trim().split("\n")[0]}` : ""}`);
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
Usage: doctrina context [<capability>] [--for "<task>"] [--concat]
                        [--budget <tokens>] [--diff <ref>]

Print the exact context pack for a task, in the documented read
order: AGENTS.md, product.md, the capability spec (when given —
otherwise every active spec), open changes, accepted ADRs. Skills are
listed name + description + when-trigger only — they are on-demand by
design. The change archive is excluded.

Assembly is retrieval, not a dump. A token budget ALWAYS applies
(default ${DEFAULT_BUDGET}; set "config": { "context_budget": <n> } in
.doctrina/index.json, or pass --budget). Over budget, accepted ADRs
degrade to title + summary — least relevant first — before anything is
dropped, and the report names what was given up. Naming a capability
also drops the ADRs scoped away from it; see \`doctrina decision scope\`.

Flags:
  --for "<task>"    Rank the pack by relevance to a task description, so
                    what survives the budget is what the task is about.
  --concat          Print the file contents (with separators) instead of
                    the list — ready to pipe into an agent. The budget
                    verdict goes to stderr, keeping stdout pure.
  --budget <n>      Token ceiling for this call, overriding the project's.
  --diff <ref>      Scope the stable artifacts (AGENTS.md, product.md,
                    specs, ADRs) to those changed since the git ref; open
                    changes are always included. The resume-session read.

Read-only. Exits 1 only when the pack's core alone exceeds the budget —
which the report explains rather than silently exceeding.
`;

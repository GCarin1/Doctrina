import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { exists, isDir, isFile, mkdirp, read, relPath, write } from "../lib/fs-ops.js";
import { flagString, flagBool } from "../lib/args.js";
import * as idx from "../lib/index-json.js";
import { c } from "../lib/colors.js";
import { assessBrief } from "../lib/clarity.js";
import { locateTemplatesDir, substitute } from "../lib/templates.js";
import { changeNew } from "./change.js";

// `work` is the second half of the no-ceremony path (ADR 0005): a brief
// prompt ("add login") becomes a fully scaffolded change plus a playbook
// the host agent executes — context, spec deltas, tasks, implementation,
// then the analyze → apply → verify → archive → validate close (verify =
// `doctrina verify` + `doctrina coverage`, since archive now refuses
// unproven verification). The CLI's own language processing stops at
// slugging and term counting; everything semantic is the agent's job.

export async function run(positional, flags) {
  const prompt = positional.join(" ").trim();
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  // --resume <id>: reprint the playbook for an existing open change rather than
  // open a new one (review G1 — `work "continue"` used to slug the word and
  // fabricate a junk `NNNN-continue` change the operator had to delete).
  if (flags.has("resume")) {
    return resumeChange(projectRoot, flagString(flags, "resume"));
  }

  // --from-diff backfills from code already written (review F8): the
  // working-tree changes are the input, so no prompt is required.
  const fromDiff = flagBool(flags, "from-diff", false);
  const chore = flagBool(flags, "chore", false) || flagBool(flags, "no-spec", false);
  let files = [];
  if (fromDiff) {
    files = changedFiles(projectRoot);
    if (files.length === 0) {
      console.error(c.red("error:") + " --from-diff found no working-tree changes to backfill from");
      console.error(c.gray("hint: ") + "make (or stage) the code changes first, then run `doctrina work --from-diff`");
      return 1;
    }
  }

  if (!prompt && !fromDiff) {
    console.error(c.red("error:") + " work requires a prompt (quote it if it contains spaces)");
    console.error(c.gray("hint: ") + "example: doctrina work \"add login with email and password\"");
    return 2;
  }

  // A thin, resume-shaped prompt ("continue", "prossiga", ...) while a change
  // is open is almost certainly "finish what's open", not "start a change named
  // after that word". Suggest resuming instead of creating noise; --force opens
  // a new change anyway. The match is a deterministic stoplist, not language
  // understanding (still ADR 0005).
  if (!fromDiff && !flagBool(flags, "force", false) && isResumeIntent(prompt)) {
    const open = openChanges(projectRoot);
    if (open.length > 0) {
      printResumeSuggestion(open);
      return 0;
    }
  }

  const pinned = flagString(flags, "capability");
  if (pinned && !/^[a-z][a-z0-9-]*$/.test(pinned)) {
    console.error(c.red("error:") + ` invalid capability "${pinned}" (lowercase letters, digits, hyphens)`);
    return 2;
  }

  const effPrompt = prompt || `backfill specs from ${files.length} changed file${files.length === 1 ? "" : "s"}`;
  // --title separates the short display name from the full brief: the title
  // drives the slug and the proposal H1; the whole prompt still lands, intact,
  // under ## Why. Without it a long prompt used to become a 900-char H1.
  const title = flagString(flags, "title") ?? effPrompt;
  const slug = prompt || flags.has("title") ? slugify(title) : "backfill";
  const id = flagString(flags, "id") ?? `${nextChangeNumber(projectRoot)}-${slug}`;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    console.error(c.red("error:") + ` invalid change id "${id}" (lowercase letters, digits, hyphens)`);
    return 2;
  }

  const code = changeNew([id, title], flags);
  if (code !== 0) return code;

  // Record the prompt verbatim as the change's Why — the raw intent has
  // one home, and it is the proposal, not the playbook output. For --from-diff,
  // also record the changed files so the backfill's input is in the artifact.
  const proposalPath = path.join(projectRoot, ".doctrina", "changes", id, "proposal.md");
  if (isFile(proposalPath)) {
    const txt = read(proposalPath);
    let why = effPrompt;
    if (fromDiff) {
      const list = files.slice(0, 30).map((f) => `- \`${f}\``).join("\n");
      const more = files.length > 30 ? `\n- … and ${files.length - 30} more` : "";
      why = `${effPrompt}\n\nBackfilled from working-tree changes:\n${list}${more}`;
    }
    // CRLF-tolerant: templates may be checked out with \r\n on Windows.
    let updated = txt.replace(/(## Why\r?\n\r?\n)<!--[\s\S]*?-->[ \t]*\r?\n?/, `$1${why}\n`);
    if (updated === txt) updated = txt.replace(/(## Why\r?\n)/, `$1\n${why}\n`);
    if (pinned) {
      updated = updated.replace(/^(-\s+\*\*Affects specs:\*\*).*$/m, `$1 ${pinned}`);
    }
    if (updated !== txt) write(proposalPath, updated, { force: true });
  }

  // A pinned capability is an explicit statement of intent, so the delta —
  // historically the only 100% hand-authored file in the flow, and the one
  // whose missing **Operation:** header exploded days later at analyze
  // (operator review 2026-07-19 §3.2) — is scaffolded from the template with
  // the Operation prefilled: MODIFIED when the spec exists, ADDED when it
  // does not. Never scaffolded from a ranked GUESS (that would put a wrong
  // capability's delta in the change); only from --capability.
  if (pinned && !chore) {
    const deltaPath = path.join(projectRoot, ".doctrina", "changes", id, "specs", pinned, "delta.md");
    if (!exists(deltaPath)) {
      const tpl = read(path.join(locateTemplatesDir(), "change", "spec-delta.md.template"));
      const op = isFile(path.join(projectRoot, ".doctrina", "specs", pinned, "spec.md")) ? "MODIFIED" : "ADDED";
      const body = substitute(tpl, { CAPABILITY: pinned })
        .replace(/^\*\*Operation:\*\*.*$/m, `**Operation:** ${op}`);
      mkdirp(path.dirname(deltaPath));
      write(deltaPath, body);
      console.log(c.green("created") + ` ${relPath(projectRoot, deltaPath)}` + c.gray(` (Operation: ${op} prefilled)`));
    }
  }

  // Capability hint: term overlap for a prompt, changed-file overlap for a diff
  // (review F10 — rank by what the working tree touched, not just prompt words).
  const allChanged = fromDiff ? files : changedFiles(projectRoot);
  const diffMatches = pinned ? [] : rankCapabilitiesByDiff(projectRoot, allChanged);
  const matches = pinned ? [] : (fromDiff ? diffMatches : rankCapabilities(projectRoot, effPrompt));
  const capability = pinned ?? matches[0]?.id ?? null;
  const clarity = assessBrief(effPrompt, { kind: "prompt" });

  // --quiet: registering backlog, not starting now (operator review §3.7 — 19
  // works printed 19 identical 50-line playbooks). One line per change; the
  // playbook is reprintable on demand with --resume.
  if (flagBool(flags, "quiet", false)) {
    console.log("");
    console.log(c.green("opened ") + c.cyan(id) +
      c.gray(` — playbook on demand: doctrina work --resume ${id}`));
    return 0;
  }

  console.log("");
  if (chore) {
    printChorePlaybook(projectRoot, { id, prompt: effPrompt });
  } else {
    printPlaybook(projectRoot, {
      id, prompt: effPrompt, pinned, matches, capability, clarity,
      fromDiff, diffMatches: fromDiff ? [] : diffMatches,
    });
  }
  return 0;
}

// Changed files in the working tree (tracked + untracked), for the diff-based
// capability hint and `--from-diff` backfill. Empty outside a git repo or with
// no changes. Read-only: never invokes a mutating git command.
function changedFiles(projectRoot) {
  const run = (args) => {
    const r = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
    if (r.error || r.status !== 0) return [];
    return r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  };
  const set = new Set([
    ...run(["diff", "--name-only", "HEAD"]),                 // tracked, staged + unstaged
    ...run(["ls-files", "--others", "--exclude-standard"]),  // untracked
  ]);
  return [...set];
}

// Next sequential NNNN across open changes and the archive, so work-driven
// ids stay ordered no matter how earlier changes were named.
function nextChangeNumber(projectRoot) {
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  let max = 0;
  const harvest = (name) => {
    const m = name.match(/^(\d{1,4})-/) ?? name.match(/^(\d{1,4})$/);
    if (m) max = Math.max(max, Number(m[1]));
  };
  if (isDir(changesDir)) {
    for (const entry of readdirSync(changesDir)) {
      if (entry === "archive" || entry.startsWith(".")) continue;
      if (isDir(path.join(changesDir, entry))) harvest(entry);
    }
  }
  const archiveDir = path.join(changesDir, "archive");
  if (isDir(archiveDir)) {
    for (const entry of readdirSync(archiveDir)) {
      if (!isDir(path.join(archiveDir, entry))) continue;
      harvest(entry.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
    }
  }
  return String(max + 1).padStart(4, "0");
}

// Open (non-archived) changes from the index — the set `work --resume` and
// the thin-prompt guard offer to continue.
function openChanges(projectRoot) {
  try {
    return idx.load(projectRoot).artifacts?.changes ?? [];
  } catch {
    return [];
  }
}

// A deterministic stoplist of "carry on" prompts (en + pt). Folded and
// stripped to letters so "go on" / "keep going" / "continuação" all match.
// Not language understanding — just the words that mean "resume", which is
// exactly when slugging the prompt produces a junk change (G1).
const RESUME_WORDS = new Set([
  "continue", "continua", "continuar", "continuacao", "continuemos", "continuando",
  "prossiga", "prosseguir", "prossegue", "proceed", "resume", "resumir",
  "retomar", "retoma", "segue", "seguir", "go", "goon", "next", "keepgoing",
  "vamos", "more", "mais",
]);

function isResumeIntent(prompt) {
  return RESUME_WORDS.has(fold(prompt).replace(/[^a-z0-9]+/g, ""));
}

function printResumeSuggestion(open) {
  console.log(c.yellow(`open change${open.length === 1 ? "" : "s"} detected`) +
    " — did you mean to continue one of these?");
  console.log("");
  for (const ch of open) {
    console.log(`    ${c.cyan(ch.id)}  ${c.gray((ch.title ?? "").slice(0, 60))}  ${c.gray(`[${ch.status ?? "open"}]`)}`);
  }
  console.log("");
  console.log("Resume the existing change (reprints its playbook):");
  console.log(`    ${c.cyan(`doctrina work --resume ${open[0].id}`)}`);
  console.log("Or open a new change anyway:");
  console.log(`    ${c.cyan(`doctrina work "<prompt>" --force`)}`);
}

// Reprint the work playbook for an already-open change, ranking capabilities
// from its recorded title (the original prompt). Creates nothing.
function resumeChange(projectRoot, resumeId) {
  const open = openChanges(projectRoot);
  if (!resumeId || resumeId === true) {
    console.error(c.red("error:") + " --resume needs a change id");
    if (open.length) console.error(c.gray("open: ") + open.map((ch) => ch.id).join(", "));
    return 2;
  }
  const entry = open.find((ch) => ch.id === resumeId);
  if (!entry && !isDir(path.join(projectRoot, ".doctrina", "changes", resumeId))) {
    console.error(c.red("error:") + ` no open change "${resumeId}"`);
    if (open.length) console.error(c.gray("open: ") + open.map((ch) => ch.id).join(", "));
    return 1;
  }
  const prompt = entry?.title ?? resumeId;
  const matches = rankCapabilities(projectRoot, prompt);
  const capability = matches[0]?.id ?? null;
  const clarity = assessBrief(prompt, { kind: "prompt" });
  console.log(c.bold(`Resuming change ${resumeId}`) + c.gray(" — agent-executed (ADR 0005)."));
  console.log("");
  printPlaybook(projectRoot, { id: resumeId, prompt, pinned: null, matches, capability, clarity });
  return 0;
}

// ASCII-folded kebab-case of the prompt ("Faça o login" -> "faca-o-login").
// Over-long slugs are cut at a WORD boundary, not mid-token — a 900-char
// prompt used to produce folder names ending in a half word ("...-scoped-c"),
// which then leaks into every path, ledger line, and archive name.
export function slugify(text) {
  let slug = text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > 48) {
    const cut = slug.slice(0, 49); // one past the cap: a "-" here means 48 ends a word
    const boundary = cut.lastIndexOf("-");
    slug = (boundary > 0 ? cut.slice(0, boundary) : cut.slice(0, 48)).replace(/-+$/g, "");
  }
  return slug.length > 0 ? slug : "task";
}

// Deterministic term overlap: fold prompt and spec text to ASCII lowercase,
// drop short/stop words, score name hits heavily and body hits lightly.
// This is a hint for the agent, never a decision (ADR 0005).
const STOPWORDS = new Set([
  // en
  "the", "and", "for", "with", "from", "that", "this", "into", "when",
  "then", "shall", "should", "must", "can", "will", "make", "add", "new",
  "use", "create", "implement", "feature", "system", "user", "users",
  // pt (ASCII-folded)
  "uma", "umas", "uns", "dos", "das", "nos", "nas", "por", "para", "com",
  "que", "sem", "aos", "faca", "fazer", "criar", "crie", "novo", "nova",
  "adicionar", "adicione", "implementar", "implemente", "funcionalidade",
  "sistema", "usuario", "usuarios",
]);

function fold(text) {
  return text.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
}

function promptTerms(prompt) {
  return [...new Set(
    fold(prompt)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  )];
}

export function rankCapabilities(projectRoot, prompt) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const terms = promptTerms(prompt);
  if (terms.length === 0 || !isDir(specsDir)) return [];

  const ranked = [];
  for (const cap of readdirSync(specsDir).sort()) {
    const specPath = path.join(specsDir, cap, "spec.md");
    if (!isFile(specPath)) continue;
    const body = fold(read(specPath));
    const nameTokens = cap.split("-");
    let score = 0;
    for (const term of terms) {
      if (nameTokens.includes(term)) score += 5;
      const hits = body.split(term).length - 1;
      score += Math.min(hits, 5);
    }
    if (score > 0) ranked.push({ id: cap, score, path: `.doctrina/specs/${cap}/spec.md` });
  }
  return ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3);
}

// Rank capabilities by the working tree, not the prompt (review F10): a changed
// file scores its capability when the file sits under a path segment named for
// it, or when the spec cites the file as evidence. A deterministic overlap
// hint for the agent — never a decision (ADR 0005).
export function rankCapabilitiesByDiff(projectRoot, files, { limit = 3 } = {}) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (!files || files.length === 0 || !isDir(specsDir)) return [];
  const norm = files.map((f) => f.replace(/\\/g, "/"));

  const ranked = [];
  for (const cap of readdirSync(specsDir).sort()) {
    const specPath = path.join(specsDir, cap, "spec.md");
    if (!isFile(specPath)) continue;
    const specText = read(specPath);
    let score = 0;
    for (const f of norm) {
      if (f.split("/").includes(cap)) score += 3;            // src/<cap>/... etc.
      if (specText.includes(f)) score += 5;                  // file cited in the spec
      else if (specText.includes(path.basename(f))) score += 2; // filename cited
    }
    if (score > 0) ranked.push({ id: cap, score, path: `.doctrina/specs/${cap}/spec.md` });
  }
  // `limit` keeps the work-playbook hint short (top 3); review passes
  // Infinity — truncating there is how it missed 5 of 8 touched capabilities
  // in the 0.11.0 field session.
  return ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}

// A chore is a spec-less change (review F9): the playbook drops the spec-delta
// steps and goes straight to implement → verify → archive → validate, so the
// agent is not prompted to invent a delta for infra/docs/build work.
function printChorePlaybook(projectRoot, { id, prompt }) {
  console.log(c.bold(`Chore playbook — change ${id}`) + c.gray(" — agent-executed (ADR 0005); no spec deltas."));
  console.log("");
  console.log(`Prompt: "${prompt}"`);
  console.log("");
  console.log("Execute in order, in a single linear pass:");
  console.log("");
  console.log(`1. Replace the placeholder tasks in .doctrina/changes/${id}/tasks.md`);
  console.log("   with small, checkable steps; implement them, checking each box.");
  console.log("2. Prove it (archive refuses unchecked boxes):");
  console.log(`       ${c.cyan("doctrina verify")}     — the project's typecheck/test/build gate`);
  console.log(`       ${c.cyan("doctrina verify --clean")} — clean-checkout reproducibility lint`);
  console.log("   Then check the proposal's ## Verification boxes and every task.");
  console.log("3. This is a chore: no spec changes. If you find yourself needing a");
  console.log(`   spec delta, it is not a chore — reopen with ${c.cyan("doctrina work \"<prompt>\"")}.`);
  console.log(`4. ${c.cyan(`doctrina change apply ${id}`)}  (zero deltas → flips to applied).`);
  console.log(`5. ${c.cyan(`doctrina change archive ${id}`)}, then ${c.cyan("doctrina validate")}.`);
  console.log(c.gray("   If this fix taught a lesson worth not relearning, capture it: ") +
    c.cyan("doctrina skill new <slug>") + c.gray("."));
}

function printPlaybook(projectRoot, { id, prompt, pinned, matches, capability, clarity, fromDiff = false, diffMatches = [] }) {
  const capToken = capability ?? "<capability>";
  const title = fromDiff ? "Backfill playbook" : "Work playbook";
  console.log(c.bold(`${title} — change ${id}`) + c.gray(" — agent-executed (ADR 0005)."));
  console.log("");
  console.log(`Prompt: "${prompt}"`);
  if (fromDiff) {
    console.log(c.gray("Code-first: write the spec that describes what the working tree already does."));
  }

  // Clarification gate (review Topic A): a thin prompt is the moment to ask
  // the user, not to invent a spec. Advisory — the change is still scaffolded
  // (it is a draft), but the agent is told to resolve the gaps first.
  if (clarity?.thin && !fromDiff) {
    console.log("");
    console.log(c.yellow("⚠ thin prompt — clarify with the user before writing spec deltas:"));
    for (const r of clarity.reasons) console.log(`    - ${r}`);
  }

  if (pinned) {
    const hasSpec = isFile(path.join(projectRoot, ".doctrina", "specs", pinned, "spec.md"));
    console.log(`Capability (pinned): ${c.cyan(pinned)}` +
      (hasSpec ? "" : c.yellow(" — no spec yet; create it in step 2")));
  } else if (matches.length > 0) {
    const how = fromDiff ? "touched by your working tree" : "deterministic term match";
    console.log(`Likely capabilities (${how} — a hint, not a decision):`);
    for (const m of matches) {
      console.log(`    ${c.cyan(m.id.padEnd(20))} score ${String(m.score).padStart(3)}   ${c.gray(m.path)}`);
    }
  } else {
    console.log(c.gray(fromDiff
      ? "No existing spec matches the changed files — likely a new capability."
      : "No existing spec matches the prompt — likely a new capability."));
  }

  // Extra signal (review F10): even for a prompt-driven change, show which
  // capabilities the working tree touched — often the truer hint.
  if (!fromDiff && diffMatches.length > 0) {
    console.log(c.gray("Also touched by your working tree: ") +
      diffMatches.map((m) => c.cyan(m.id)).join(", "));
  }

  console.log("");
  console.log("Execute in order, in a single linear pass:");
  console.log("");
  console.log("1. Read the context pack and confirm (or correct) the capability:");
  console.log(`       ${c.cyan(`doctrina context ${capToken} --concat`)}`);
  console.log("");
  console.log("2. If the capability has no spec yet:");
  console.log(`       ${c.cyan("doctrina spec new <capability>")}`);
  console.log(c.gray("   Trace it to product intent: tag the product.md success-criteria bullet"));
  console.log(c.gray("   it serves with an anchor (\"- [SC1] ...\") and set the spec's"));
  console.log(c.gray("   \"**Realizes:** SC1\" header (or \"n/a — <why>\"). `doctrina validate` warns"));
  console.log(c.gray("   on an active spec with no Realizes; `doctrina trace` reports the link."));
  console.log("");
  if (pinned) {
    console.log(`3. A delta is already scaffolded (Operation prefilled) at`);
    console.log(`   .doctrina/changes/${id}/specs/${pinned}/delta.md — fill its body.`);
    console.log("   Add one more delta per additional affected capability:");
  } else {
    console.log("3. Write one delta per affected capability at");
    console.log(`   .doctrina/changes/${id}/specs/<capability>/delta.md:`);
  }
  console.log(c.gray("       # Spec Delta — capability: <capability>"));
  console.log(c.gray("       **Operation:** ADDED | MODIFIED | REMOVED"));
  console.log(c.gray("       **Target spec on apply:** `.doctrina/specs/<capability>/spec.md`"));
  console.log(c.gray("       ---"));
  console.log(c.gray("       <EARS body. Keep the two axes honest (Status vs Implementation),"));
  console.log(c.gray("        keep aspiration under ## Maturity → Future, and cite the proof per"));
  console.log(c.gray("        criterion: \"1. [unverified] <signal> — verified by `path/to/test`\">"));
  console.log(c.gray("   New capability? `spec new` then an ADDED delta with the FULL body — apply"));
  console.log(c.gray("   replaces the untouched scaffold. Bookkeeping edits? MODIFIED with an ops"));
  console.log(c.gray("   block, applied mechanically (all ops or none):"));
  console.log(c.gray("       ```ops"));
  console.log(c.gray("       set-header Implementation: verified — `src/x.js`"));
  console.log(c.gray("       bump-version minor"));
  console.log(c.gray("       set-criterion 1: verified"));
  console.log(c.gray("       append-criterion [unverified] new signal — verified by `test/y.test.js`"));
  console.log(c.gray("       append-requirement event: When <trigger>, the system shall <action>."));
  console.log(c.gray("       replace-requirement ubiquitous 2: The system shall <action>."));
  console.log(c.gray("       ```"));
  console.log(c.gray("   append-* ops number/position at APPLY time, so concurrent changes"));
  console.log(c.gray("   appending to the same spec never collide. Only free-prose rewrites"));
  console.log(c.gray("   (Purpose, Maturity, ...) stay a by-hand merge."));
  if (fromDiff) {
    console.log(c.gray("   --from-diff: the code already exists — describe its CURRENT behaviour, and"));
    console.log(c.gray("   mark each criterion [unverified] until a test proves it (don't assume the"));
    console.log(c.gray("   diff is tested). The changed files are listed in the proposal's ## Why."));
  }
  console.log("");
  console.log(`4. Replace the placeholder tasks in .doctrina/changes/${id}/tasks.md`);
  console.log("   with small, checkable implementation tasks (a few hours each, max).");
  console.log("");
  console.log("5. Implement task by task, checking each box as it lands. Advance the");
  console.log("   spec's Implementation: planned → partial → implemented as code lands.");
  console.log("   If the prompt is genuinely ambiguous, ask the user before assuming.");
  console.log("");
  console.log(`6. ADR checkpoint — does this change decide something structural`);
  console.log("   (an architecture, a boundary, a trade-off a future session must");
  console.log(`   not relitigate)? If yes: ${c.cyan("doctrina decision new \"<title>\"")} now,`);
  console.log("   before closing — the definition of done requires it recorded.");
  console.log(c.gray("   (close re-checks this: it warns when the change touches capabilities"));
  console.log(c.gray("   cited by an accepted ADR — amend via decision supersede, not silence.)"));
  console.log("   Touching an integration surface (ports, env vars, public endpoints)?");
  console.log(`   Own it in a contract: ${c.cyan("doctrina contract new <id>")} · ${c.cyan("doctrina contract check")}.`);
  console.log("");
  console.log(`7. Close in one attested pass (preferred — runs every gate and stops`);
  console.log("   at the first failure with the exact rerun command):");
  console.log(`       ${c.cyan(`doctrina close ${id}`)}`);
  console.log(c.gray("   (equivalent, step by step: ") +
    c.gray(`analyze → change apply → verify → coverage → trace → change archive → validate)`));
  console.log("   Before it: check the proposal's ## Verification boxes and every task,");
  console.log("   closing steps included, and bump Implementation to verified.");
  console.log("");
  console.log(`8. ${c.cyan("doctrina next")} for the follow-up.`);
  console.log(c.gray("   If this change taught a reusable lesson (a fix you'd hate to relearn,"));
  console.log(c.gray("   a recurring convention), capture it: ") + c.cyan("doctrina skill new <slug>") + c.gray("."));
}

export const help = `
Usage: doctrina work "<prompt>" [--capability <cap>] [--id <id>] [--force]

Turn a brief prompt into a scaffolded change plus the work playbook the
host AI agent executes (see ADR 0005). The CLI derives a sequential
change id (NNNN-<slug>) from the prompt, opens the change folder,
records the prompt under the proposal's "## Why", ranks existing specs
by term overlap as a capability hint, flags a thin/under-specified prompt
so you clarify before writing deltas (advisory), and prints the steps:
context → spec delta → tasks → implement → analyze → apply → verify
(verify + coverage) → archive → validate. No natural-language
interpretation happens in the CLI.

When the prompt is a bare "continue"/"prossiga"/"next" and a change is
already open, work suggests resuming it instead of opening a junk change
named after that word (review G1). Use --resume to do so directly.

Options:
  --title "<short>"    Short display title: drives the slug and the proposal
                       H1; the full prompt still lands under ## Why
  --capability <cap>   Pin the capability instead of ranking matches. Also
                       scaffolds specs/<cap>/delta.md in the change with the
                       Operation header prefilled (MODIFIED when the spec
                       exists, ADDED when it does not)
  --quiet              Register the change and print one line — no playbook
                       (backlog entry; reprint later with --resume <id>)
  --id <id>            Override the derived change id
  --resume <id>        Reprint the playbook for an open change; create nothing
  --from-diff          Backfill: scaffold from the working-tree changes (no
                       prompt needed) and print a code-first playbook (F8)
  --chore, --no-spec   Open a spec-less chore change (infra/docs/build) with a
                       playbook that skips the spec-delta steps (F9)
  --force              Open a new change even when one is open, and overwrite
                       an existing change folder
`;

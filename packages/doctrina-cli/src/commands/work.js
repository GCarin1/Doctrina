// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, mkdirp, read, relPath, write } from "../lib/fs-ops.js";
import { flagString, flagBool } from "../lib/args.js";
import * as idx from "../lib/index-json.js";
import { c } from "../lib/colors.js";
import { assessBrief } from "../lib/clarity.js";
import { locateTemplatesDir, substitute } from "../lib/templates.js";
import { EXIT, notADoctrinaProject } from "../lib/exit-codes.js";
import { changeNew, reindexChange } from "../lib/change-ops.js";
import { classify } from "../lib/triage-model.js";
import { printPlaybookTemplate } from "../lib/playbook.js";
import { changedFiles } from "../lib/git.js";
import { slugFromPrompt, fold, CONFIDENT_MARGIN } from "../lib/lexicon.js";
import { rankCapabilities, rankCapabilitiesByDiff } from "../lib/work-model.js";
export { rankCapabilities, rankCapabilitiesByDiff } from "../lib/work-model.js";

// `work` is the second half of the no-ceremony path (ADR 0005): a brief
// prompt ("add login") becomes a fully scaffolded change plus a playbook
// the host agent executes — context, spec deltas, tasks, implementation,
// then the analyze → apply → verify → archive → validate close (verify =
// `doctrina verify` + `doctrina coverage`, since archive now refuses
// unproven verification). The CLI's own language processing stops at
// slugging and term counting; everything semantic is the agent's job.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "chore", "force", "from-diff", "no-spec", "quiet"], string: ["capability", "id", "resume", "title"] };

export async function run(positional, flags) {
  const prompt = positional.join(" ").trim();
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
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
    files = changedFiles(projectRoot).files;
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

  // LANE CHECK (change 0029). `work` was the default answer to every
  // request, so a broken workflow or a suite that ran nothing became a
  // change with a proposal, tasks and a spec delta — ceremony spent on a
  // diagnosis, and a close that attested to nothing. A runtime-shaped
  // prompt is stopped here, once, with the diagnosis path named. It is a
  // deterministic term match and it can be wrong, so --force proceeds and
  // the message says so.
  // The verdict is computed for EVERY prompt, not only the ones the hold
  // applies to (change 0042). It used to be calculated, printed and thrown
  // away, so an archived proposal never recorded which lane the change was
  // born in — no report could say what kind of work the team does, and the
  // classifier had no set of right and wrong answers to be calibrated
  // against. It is recorded as HISTORY: a gate never reads it to decide.
  const verdict = prompt ? classify(prompt) : null;
  const forced = flagBool(flags, "force", false);
  if (!fromDiff && !chore && !forced) {
    if (verdict && verdict.lane === "runtime" && verdict.confident) {
      console.error(c.yellow("hold:") + " this reads as a RUNTIME problem, not a change of behaviour");
      console.error(c.gray(`signals: ${[...new Set(verdict.scores.runtime.hits)].slice(0, 6).join(", ")}`));
      console.error("");
      console.error("Nothing here says the spec is wrong — diagnose the running system first:");
      console.error(`  ${c.cyan(`doctrina triage "${prompt.length > 60 ? `${prompt.slice(0, 59)}…` : prompt}"`)}`);
      console.error("");
      console.error(c.gray("If the requirement really is missing, open the change anyway:"));
      console.error(c.gray("  doctrina work --force \"<prompt>\"   ·   or --chore for wiring already specified"));
      // PRECONDITION: the work may be perfectly valid; this project has
      // simply not been diagnosed yet. A gate code (1) would read as
      // "the prompt is bad" and invite rewording it forever.
      return EXIT.PRECONDITION;
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
  // The id is what a person types and what sorts a backlog, so it stays short;
  // the title is what a person reads, so it stays whole (change 0070). With
  // `--title` the author has already made that split, so the slug follows the
  // title they chose; without it, the slug is the prompt's first content words
  // and the H1's title half is the prompt, so the two halves stop being the
  // same sentence twice.
  const slug = flags.has("title")
    ? slugify(title)
    : (prompt ? slugFromPrompt(prompt) : "backfill");
  const id = flagString(flags, "id") ?? `${nextChangeNumber(projectRoot)}-${slug}`;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    console.error(c.red("error:") + ` invalid change id "${id}" (lowercase letters, digits, hyphens)`);
    return 2;
  }

  const code = changeNew([id, title], flags);
  if (code !== 0) return code;

  // The CLI reduces a prompt to an id deterministically; it cannot write a
  // good short name, and ADR 0005 says it must not try. So it says how to get
  // one, once, where the author is already looking.
  if (!flags.has("title") && !flags.has("id") && prompt) {
    console.error(c.gray("note:  ") +
      `id derived from the prompt — \`--title "<short name>"\` gives a shorter one ` +
      "and keeps the full prompt under ## Why");
  }

  // Stamp the lane the classifier read, and — when the operator went a
  // different way — what they did instead. Recording only the agreements
  // would make the calibration set exactly the one that needs no
  // calibrating; the disagreements are the data.
  writeLane(projectRoot, id, verdict, { forced, chore, fromDiff });

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

  // Capability hint: term overlap for a prompt, changed-file overlap for a diff
  // (review F10 — rank by what the working tree touched, not just prompt words).
  const allChanged = fromDiff ? files : changedFiles(projectRoot).files;
  const diffMatches = pinned ? [] : rankCapabilitiesByDiff(projectRoot, allChanged);
  const promptMatches = pinned || fromDiff ? [] : rankCapabilities(projectRoot, effPrompt);
  const matches = pinned ? [] : (fromDiff ? diffMatches : promptMatches);
  const capability = pinned ?? matches[0]?.id ?? null;
  const clarity = assessBrief(effPrompt, { kind: "prompt" });

  // The delta is scaffolded whenever the CLI can NAME the capability — from
  // --capability, or from a prompt ranking whose winner leads the runner-up
  // by a real margin (change 0044). It was historically the only 100%
  // hand-authored file in the flow, and the one whose missing **Operation:**
  // header exploded days later at analyze (operator review 2026-07-19 §3.2);
  // leaving the default path hand-authoring it left the failure in place for
  // every run that did not pin. A wrong, obvious file costs less than an
  // absent, silent one — so the guess is MARKED as one, and below the margin
  // nothing is written at all: a weak guess in the wrong folder is worse
  // than no file.
  //
  // Only the PROMPT ranking scaffolds. The diff ranker scores on its own
  // scale (path/citation points, no density term), so CONFIDENT_MARGIN does
  // not transfer to it, and a backfill normally touches several capabilities
  // at once — one scaffolded winner would be the wrong shape there.
  const winner = promptMatches[0];
  const guess = winner && winner.margin >= CONFIDENT_MARGIN ? winner : null;
  const scaffolded = chore || !capability || (!pinned && !guess)
    ? null
    : scaffoldDelta(projectRoot, { id, capability, guess, runnerUp: promptMatches[1] ?? null });

  // The proposal is written in two passes — `changeNew` scaffolds it, the
  // lines above stamp the lane and the pinned specs — so its index entry is
  // re-derived HERE, from the finished file. Indexing at the end of the first
  // pass is what made every `doctrina work` leave the tree failing `validate`
  // on the very next command (change 0076).
  reindexChange(projectRoot, id);

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
      id, prompt: effPrompt, pinned, matches, capability, clarity, scaffolded,
      fromDiff, diffMatches: fromDiff ? [] : diffMatches,
    });
  }
  return 0;
}

// Write the change's spec delta from the template with **Operation:**
// prefilled — MODIFIED when the target spec exists, ADDED when it does not.
//
// A GUESS (the ranked winner rather than a pinned capability) can only ever
// be MODIFIED: the ranker scores existing specs, so it cannot name one that
// is not there. It carries a comment saying it is a guess and how to correct
// it, because the whole trade this makes is that a wrong file the agent can
// see beats a missing file nothing reports.
//
// Returns what was written, or null when the file already exists.
function scaffoldDelta(projectRoot, { id, capability, guess = null, runnerUp = null }) {
  const deltaPath = path.join(projectRoot, ".doctrina", "changes", id, "specs", capability, "delta.md");
  if (exists(deltaPath)) return null;
  const tpl = read(path.join(locateTemplatesDir(), "change", "spec-delta.md.template"));
  const op = isFile(path.join(projectRoot, ".doctrina", "specs", capability, "spec.md")) ? "MODIFIED" : "ADDED";
  let body = substitute(tpl, { CAPABILITY: capability })
    .replace(/^\*\*Operation:\*\*.*$/m, `**Operation:** ${op}`);
  if (guess) body = body.replace(/(\*\*Target spec on apply:\*\*.*\r?\n)/, `$1\n${guessNote(id, guess, runnerUp)}\n`);
  mkdirp(path.dirname(deltaPath));
  write(deltaPath, body);
  console.log(c.green("created") + ` ${relPath(projectRoot, deltaPath)}` +
    c.gray(guess
      ? ` (Operation: ${op} prefilled — ranked guess, correct it if wrong)`
      : ` (Operation: ${op} prefilled)`));
  return { capability, op, guess: Boolean(guess) };
}

// The words that make a guessed delta self-describing on disk: --resume
// prints nothing it did not write itself, so the file is the only place a
// later session can learn the capability was ranked rather than chosen.
const GUESS_MARK = "RANKED GUESS";

// The mark a guessed delta carries. It names the evidence (the score and the
// runner-up it beat) and the exact correction, so the agent can overrule the
// ranking in one step instead of inheriting it silently.
function guessNote(id, guess, runnerUp) {
  const beat = runnerUp
    ? `beating \`${runnerUp.id}\` (${runnerUp.score})`
    : "the only spec the prompt matched";
  return [
    `<!-- ${GUESS_MARK} — no --capability was given. \`doctrina work\` picked`,
    `     \`${guess.id}\` by deterministic term overlap (score ${guess.score}, ${beat}).`,
    "     It is a hint, never a decision (ADR 0005). If it is the wrong",
    "     capability, delete this folder and write the right one instead:",
    `         rm -r .doctrina/changes/${id}/specs/${guess.id}`,
    `         .doctrina/changes/${id}/specs/<capability>/delta.md`,
    "     Delete this comment once the capability is confirmed. -->",
  ].join("\n");
}

// Render the Lane header: the classifier's verdict, how sure it was, the
// signals that decided it, and any operator override. One line, so the
// proposal header stays a header.
function laneRecord(verdict, { forced, chore, fromDiff }) {
  const override = chore ? "chore" : fromDiff ? "backfill" : null;
  if (!verdict) return override ? `${override} (no prompt to classify)` : "";
  const hits = [...new Set(verdict.scores[verdict.lane]?.hits ?? [])].slice(0, 6);
  const detail = hits.length > 0 ? `; signals: ${hits.join(", ")}` : "";
  let line = `${verdict.lane} (${verdict.confident ? "confident" : "uncertain"}${detail})`;
  // The operator disagreed with the classifier, or overrode its hold. That is
  // the row calibration actually needs: recording only the agreements would
  // make the set exactly the one that needs no calibrating.
  if (override) line += ` — opened as ${override}`;
  else if (forced && verdict.lane === "runtime") line += " — opened anyway (--force)";
  return line;
}

function writeLane(projectRoot, id, verdict, opts) {
  const line = laneRecord(verdict, opts);
  if (!line) return;
  const proposalPath = path.join(projectRoot, ".doctrina", "changes", id, "proposal.md");
  if (!isFile(proposalPath)) return;
  const text = read(proposalPath);
  // CRLF-safe: the scaffolded proposals are CRLF, and a `.*$` pattern
  // silently matches nothing against them — the `patch-doctrina-files-as-crlf`
  // skill exists for exactly this mistake.
  const updated = text.replace(/^(-[ \t]+\*\*Lane:\*\*)[^\r\n]*/m, `$1 ${line}`);
  if (updated !== text) write(proposalPath, updated, { force: true });
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
  // --resume creates nothing, but it must not tell the agent to write a delta
  // the first run already scaffolded (pinned or guessed): it reads the folder.
  const deltaPath = capability
    ? path.join(projectRoot, ".doctrina", "changes", resumeId, "specs", capability, "delta.md")
    : null;
  const existing = deltaPath && isFile(deltaPath)
    ? { capability, op: null, guess: read(deltaPath).includes(GUESS_MARK) }
    : null;
  console.log(c.bold(`Resuming change ${resumeId}`) + c.gray(" — agent-executed (ADR 0005)."));
  console.log("");
  printPlaybook(projectRoot, { id: resumeId, prompt, pinned: null, matches, capability, clarity, scaffolded: existing });
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

// A chore is a spec-less change (review F9): the playbook drops the spec-delta
// steps and goes straight to implement → verify → archive → validate, so the
// agent is not prompted to invent a delta for infra/docs/build work.
// Both playbooks are rendered from templates (lib/playbook.js), resolved
// project-over-bundled like every other scaffold. What stays here is the only
// part that is not prose: computing the variable blocks. Each is PRE-RENDERED
// into a token, so `substitute` stays a plain string map and the template
// stays a document rather than a language with conditionals in it.
function printChorePlaybook(projectRoot, { id, prompt }) {
  printPlaybookTemplate(projectRoot, "chore", { CHANGE_ID: id, PROMPT: prompt });
}

function printPlaybook(projectRoot, { id, prompt, pinned, matches, capability, clarity, scaffolded = null, fromDiff = false, diffMatches = [] }) {
  printPlaybookTemplate(projectRoot, "work", {
    TITLE: fromDiff ? "Backfill playbook" : "Work playbook",
    CHANGE_ID: id,
    PROMPT: prompt,
    CAPABILITY: capability ?? "<capability>",
    FROM_DIFF_NOTE: fromDiff
      ? c.gray("Code-first: write the spec that describes what the working tree already does.")
      : "",
    // Clarification gate (review Topic A): a thin prompt is the moment to ask
    // the user, not to invent a spec. Advisory — the change is still
    // scaffolded (it is a draft), but the agent is told to resolve the gaps
    // first. The leading blank line belongs to the block, so an absent
    // warning leaves no gap behind.
    THIN_WARNING: clarity?.thin && !fromDiff
      ? ["", c.yellow("⚠ thin prompt — clarify with the user before writing spec deltas:"),
         ...clarity.reasons.map((r) => `    - ${r}`)].join("\n")
      : "",
    CAPABILITY_BLOCK: capabilityBlock(projectRoot, { pinned, matches, fromDiff }),
    // Extra signal (review F10): even for a prompt-driven change, show which
    // capabilities the working tree touched — often the truer hint.
    DIFF_MATCHES: !fromDiff && diffMatches.length > 0
      ? c.gray("Also touched by your working tree: ") + diffMatches.map((m) => c.cyan(m.id)).join(", ")
      : "",
    STEP3_INTRO: scaffolded
      ? "3. A delta is already scaffolded (Operation prefilled) at\n" +
        `   .doctrina/changes/${id}/specs/${scaffolded.capability}/delta.md — fill its body.\n` +
        (scaffolded.guess
          // Coloured per line: a span left open across a newline survives a
          // terminal but not every pager the output gets piped into.
          ? c.yellow("   It was RANKED, not pinned — confirm the capability first; the file") + "\n" +
            c.yellow("   says how to correct it if the ranking got it wrong.") + "\n"
          : "") +
        "   Add one more delta per additional affected capability:"
      : "3. Write one delta per affected capability at\n" +
        `   .doctrina/changes/${id}/specs/<capability>/delta.md:`,
    FROM_DIFF_DELTA_NOTE: fromDiff
      ? [c.gray("   --from-diff: the code already exists — describe its CURRENT behaviour, and"),
         c.gray("   mark each criterion [unverified] until a test proves it (don't assume the"),
         c.gray("   diff is tested). The changed files are listed in the proposal's ## Why.")].join("\n")
      : "",
  });
}

// Which capability the change is about, as far as the CLI can tell: pinned by
// the operator, ranked by term overlap, or nothing — a hint in every case,
// never a decision (ADR 0005).
function capabilityBlock(projectRoot, { pinned, matches, fromDiff }) {
  if (pinned) {
    const hasSpec = isFile(path.join(projectRoot, ".doctrina", "specs", pinned, "spec.md"));
    return `Capability (pinned): ${c.cyan(pinned)}` +
      (hasSpec ? "" : c.yellow(" — no spec yet; create it in step 2"));
  }
  if (matches.length > 0) {
    const how = fromDiff ? "touched by your working tree" : "deterministic term match";
    return [`Likely capabilities (${how} — a hint, not a decision):`,
      ...matches.map((m) => `    ${c.cyan(m.id.padEnd(20))} score ${String(m.score).padStart(3)}   ${c.gray(m.path)}`),
    ].join("\n");
  }
  return c.gray(fromDiff
    ? "No existing spec matches the changed files — likely a new capability."
    : "No existing spec matches the prompt — likely a new capability.");
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

The change's spec delta is scaffolded with **Operation:** prefilled
whenever the CLI can name the capability: from --capability, or from the
ranking when the winner leads the runner-up by a whole matched term. A
ranked delta is always MODIFIED and says in the file that it is a guess,
with the command that corrects it. Below that margin nothing is written.

When the prompt is a bare "continue"/"prossiga"/"next" and a change is
already open, work suggests resuming it instead of opening a junk change
named after that word (review G1). Use --resume to do so directly.

Options:
  --title "<short>"    Short display title: drives the slug and the proposal
                       H1; the full prompt still lands under ## Why
  --capability <cap>   Pin the capability instead of ranking matches, and
                       drop the guess comment from the scaffolded delta
  --quiet              Register the change and print one line — no playbook
                       (backlog entry; reprint later with --resume <id>)
  --id <id>            Override the derived change id
  --resume <id>        Reprint the playbook for an open change; create nothing
  --from-diff          Backfill: scaffold from the working-tree changes (no
                       prompt needed) and print a code-first playbook (F8)
  --chore, --no-spec   Open a spec-less chore change (infra/docs/build) with a
                       playbook that skips the spec-delta steps (F9)
  --force              Open a new change even when one is open, overwrite an
                       existing change folder, and proceed past the lane hold
                       below

A prompt that reads as a RUNTIME problem — a workflow, an env value, a run
that executed nothing — is HELD before anything is scaffolded, and pointed
at \`doctrina triage\` instead (exit 3: a precondition, not a bad prompt).
The classifier is deterministic term matching and can be wrong; --force
opens the change anyway, and --chore is the lane for wiring the spec
already covers.
`;

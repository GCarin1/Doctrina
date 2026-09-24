// @ts-check
// Writing the intake and printing the bootstrap playbook.
//
// `init --intake` performs the same three operations `intake` does, and
// reached into `commands/intake.js` for them (audit finding F7). They are
// operations over the tree, not renderings of one command, so both
// entry points read them from here.
import path from "node:path";
import { exists, isFile, read, relPath, write } from "./fs-ops.js";
import { assessBrief } from "./clarity.js";
import { c } from "./colors.js";
import { printPlaybookTemplate } from "./playbook.js";
import { getHeader, setHeader } from "./doc-model.js";
import { stateWord } from "./spec-ops.js";
// Clarification gate (review Topic A). A description too thin to spec from is
// the moment to ask the user, not to let the agent invent requirements. Prints
// the specific gaps before the bootstrap playbook; advisory, never blocking —
// the intake is still captured verbatim (the playbook step 6 resolves it).
/**
 * Does this argument read as a FILE PATH, or as the description itself?
 *
 * `doctrina intake "<description>"` is the form the surface block's wording
 * invites — "store the intent" — and it answered `description file not found:`
 * followed by the author's whole sentence, echoed back as if it were a
 * filename, with no mention of `--text` (change 0071). Prose and a path are
 * distinguishable without guessing: a path has no sentence in it.
 *
 * Deliberately conservative — anything that could be a path IS treated as one,
 * so a real file is never mistaken for prose and read as a description.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikePath(value) {
  const v = String(value).trim();
  if (v === "") return false;
  if (/[/\\]/.test(v)) return true;            // a separator settles it
  if (/^[.~]/.test(v)) return true;             // ./x, ../x, ~/x
  if (!/\s/.test(v)) return true;              // one token: assume a filename
  if (/\.(md|txt|markdown|rst|adoc|org)$/i.test(v)) return true; // "my notes.txt"
  return false;
}

// What `init` tells a person to do next (change 0173). The first run used to
// contradict itself three ways: `init` said "edit AGENTS.md and product.md",
// `next` asked for the description again as an intake, and AGENTS.md said the
// agent runs the commands while the human stays passive. One answer now,
// the same one `next` and AGENTS.md give.
//
// `intakeFrom` is "tty" when the description was typed at init's question
// (it is stored as the intake), or null when init got no intake at all.
export function nextStepAfterInit(intakeFrom) {
  if (intakeFrom === "tty") {
    return [
      "Next: open your AI agent in this repository and tell it:",
      "    read AGENTS.md and run doctrina next",
      "It turns your description into product.md and specs; you review and approve.",
    ];
  }
  return [
    "Next: give your AI agent the whole project description. It runs",
    "    doctrina intake --text \"<description>\"",
    "and turns it into product.md and specs (AGENTS.md, \"Working from intent\");",
    "for an existing codebase, `doctrina work --from-diff` backfills them from the code.",
  ];
}

export function warnIfThinIntake(body) {
  const assessment = assessBrief(body, { kind: "intake" });
  if (!assessment.thin) return;
  console.log(c.yellow("⚠ thin intake — clarify with the user before converting to specs:"));
  for (const reason of assessment.reasons) console.log(`    - ${reason}`);
  console.log("");
}

// THE INTAKE'S STATUS IS A CONTROL VALUE, SO IT GETS AN ENUM AND AN OWNER.
//
// `next` branches on it: pending means the bootstrap is unfinished, and every
// other artifact's status in this framework is both written by a command and
// checked against an enum — `spec set` refuses "Status: nonsense", and
// `validate` calls it an error. The intake was the one header the playbook
// told an agent to edit BY HAND, and the one nothing read back.
//
// So any token that was not exactly "converted" meant pending, in silence:
// "convertido" typed in a Portuguese project, "done", or an empty value left
// by a botched edit. `validate` exited 0 on all of them and `next` went on
// asking for a bootstrap that had already happened.
export const INTAKE_STATUSES = ["pending", "converted"];

/** The intake's status word, note stripped and folded. Defaults to pending. */
export function intakeStatus(text) {
  const raw = getHeader(String(text ?? ""), "Status");
  if (raw === null) return "pending";
  return stateWord(raw) || "";
}

/** null when the intake's status is a declared value; otherwise the error. */
export function intakeStatusError(text) {
  const word = intakeStatus(text);
  if (INTAKE_STATUSES.includes(word)) return null;
  const got = getHeader(String(text ?? ""), "Status");
  return `Status must be one of ${INTAKE_STATUSES.join("|")} `
    + `(got "${String(got ?? "").trim()}") — every other value reads as pending, in silence`;
}

/**
 * Flip the stored intake to `converted`. Returns the path written, or null
 * when there is no intake (or no Status header) to flip.
 */
export function markIntakeConverted(projectRoot) {
  const intakePath = path.join(projectRoot, ".doctrina", "intake.md");
  if (!exists(intakePath)) return null;
  const next = setHeader(read(intakePath), "Status", "converted");
  if (next === null) return null;
  write(intakePath, next, { force: true });
  return intakePath;
}

// Shared with `init --intake`. Writes the intake verbatim under a small
// status header; `doctrina intake --converted` flips it at the end of the
// playbook, which is how `next` knows the bootstrap is done.
export function writeIntakeFile(projectRoot, { body, source, projectName, date, force = false }) {
  const intakePath = path.join(projectRoot, ".doctrina", "intake.md");
  const content = [
    `# Intake — ${projectName}`,
    "",
    "- **Status:** pending",
    `- **Date:** ${date}`,
    `- **Source:** ${source}`,
    "",
    "<!-- Raw project intent, stored verbatim. The bootstrap playbook",
    "     (doctrina intake) converts it into product.md and capability",
    "     specs. Close it with `doctrina intake --converted`; after that the",
    "     specs are the only source of truth; never edit this file to",
    "     change requirements. -->",
    "",
    "---",
    "",
    body.replace(/\r\n/g, "\n").replace(/\n*$/, "\n"),
  ].join("\n");
  write(intakePath, content, { force });
  return intakePath;
}

// The bootstrap playbook, like the work and chore playbooks, is a TEMPLATE
// resolved project-over-bundled (audit finding F17). What stays here is the
// one conditional: a tree that never got its specs/ directory.
export function printBootstrapPlaybook(projectRoot) {
  const hasSpecs = exists(path.join(projectRoot, ".doctrina", "specs"));
  printPlaybookTemplate(projectRoot, "bootstrap", {
    MISSING_SPECS_WARNING: hasSpecs
      ? ""
      : "\n" + c.yellow("warn:") + " .doctrina/specs/ is missing — re-run `doctrina init` first.",
  });
}
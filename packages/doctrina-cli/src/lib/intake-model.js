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

export function warnIfThinIntake(body) {
  const assessment = assessBrief(body, { kind: "intake" });
  if (!assessment.thin) return;
  console.log(c.yellow("⚠ thin intake — clarify with the user before converting to specs:"));
  for (const reason of assessment.reasons) console.log(`    - ${reason}`);
  console.log("");
}

// Shared with `init --intake`. Writes the intake verbatim under a small
// status header; the agent flips Status to converted at the end of the
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
    "     specs, then flips Status to converted. After conversion the",
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
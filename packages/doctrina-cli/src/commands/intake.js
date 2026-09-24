// @ts-check
import path from "node:path";
import process from "node:process";
import { exists, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { ensureDoctrinaProject, projectName } from "../lib/project.js";
import { listHeader } from "../lib/scan.js";
import { assessBrief } from "../lib/clarity.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { looksLikePath, markIntakeConverted, printBootstrapPlaybook, warnIfThinIntake, writeIntakeFile } from "../lib/intake-model.js";

// `init --intake` performs the same operations; they live in
// lib/intake-model.js so neither command imports out of the other (F7).
export { warnIfThinIntake, writeIntakeFile, printBootstrapPlaybook } from "../lib/intake-model.js";
import { EXIT, notADoctrinaProject } from "../lib/exit-codes.js";

// `intake` is the first half of the no-ceremony path (ADR 0005): store the
// user's FULL project description verbatim, then print the bootstrap
// playbook the host agent executes to convert it into product.md content
// and capability specs. The CLI does no interpretation — it scaffolds and
// instructs; the agent thinks.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "force", "converted"], string: ["text"] };

export async function run(positional, flags) {
  const projectRoot = process.cwd();

  // Close the bootstrap through the CLI, not by hand.
  //
  // Step 7 of the playbook used to read "flip Status to converted in
  // .doctrina/intake.md" — the one place this framework told an agent to
  // hand-author a metadata header, against its own standing rule, and the one
  // header nothing read back. A mistyped word left `next` asking forever for
  // a bootstrap that was already done.
  if (flagBool(flags, "converted", false)) {
    ensureDoctrinaProject(projectRoot);
    const written = markIntakeConverted(projectRoot);
    if (!written) {
      console.error(c.red("error:") + " no intake to mark converted at .doctrina/intake.md");
      console.error(c.gray("hint: ") + 'store one first: `doctrina intake --text "<description>"`');
      return EXIT.PRECONDITION;
    }
    console.log(c.green("converted") + ` ${relPath(projectRoot, written)} — specs are the source of truth now`);
    console.log(c.gray("next: ") + 'doctrina next');
    return EXIT.OK;
  }

  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  const force = flagBool(flags, "force", false);
  const inlineText = flagString(flags, "text");
  const sourceFile = positional[0];
  const intakePath = path.join(projectRoot, ".doctrina", "intake.md");

  // No source given: reprint the playbook for an existing intake.
  if (!sourceFile && !inlineText) {
    if (!isFile(intakePath)) {
      console.error(c.red("error:") + " no intake found and no description given");
      console.error(c.gray("hint: ") + "run `doctrina intake <file>` or `doctrina intake --text \"<description>\"`");
      // PRECONDITION: nothing is wrong with the work; the project has no
      // intake yet. The remedy is a setup command, not another attempt.
      return EXIT.PRECONDITION;
    }
    const status = (listHeader(read(intakePath), "Status") ?? "pending").toLowerCase();
    if (status === "converted") {
      console.log(c.green("ok") + " intake already converted — specs are the source of truth.");
      console.log(c.gray("hint: ") + "start implementation with `doctrina work \"<brief prompt>\"`");
      return 0;
    }
    printBootstrapPlaybook(projectRoot);
    return 0;
  }

  let body;
  let source;
  if (inlineText) {
    body = inlineText;
    source = "inline (--text)";
  } else {
    const abs = path.resolve(projectRoot, sourceFile);
    if (isFile(abs)) {
      body = read(abs);
      source = relPath(projectRoot, abs);
    } else if (looksLikePath(sourceFile)) {
      console.error(c.red("error:") + ` description file not found: ${sourceFile}`);
      console.error(c.gray("hint: ") +
        'to pass the description itself, use `doctrina intake --text "<description>"`');
      return 1;
    } else {
      // Prose, not a path (change 0071). The surface block says "store the
      // intent", so passing the intent is what its wording invites; answering
      // "description file not found:" and echoing the author's whole sentence
      // back as a filename was the CLI blaming the reader for reading it.
      body = sourceFile;
      source = "inline";
      console.error(c.gray("note:  ") +
        'read as the description itself, not as a file — `--text "<description>"` says so explicitly');
    }
  }
  if (body.trim().length === 0) {
    console.error(c.red("error:") + " the description is empty");
    return 1;
  }

  if (exists(intakePath) && !force) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, intakePath)} already exists (pass --force to overwrite)`);
    return 1;
  }
  // After conversion the specs are the only source of truth, and the intake
  // is never edited to change requirements (change 0112). `--force` was the
  // CLI-sanctioned way to do exactly that: it rewrote the file to `pending`
  // and printed the bootstrap playbook as if the tree were empty. The door
  // for new intent is `intent add`; for a change of behaviour, `work`.
  if (exists(intakePath) && (listHeader(read(intakePath), "Status") ?? "pending").toLowerCase() === "converted") {
    console.error(c.red("error:") + ` ${relPath(projectRoot, intakePath)} is already converted — the specs are the source of truth now, and --force does not reopen it`);
    console.error(c.gray("hint: ") + "new product intent: `doctrina intent add \"<text>\"` · a change of behaviour: `doctrina work \"<prompt>\"`");
    return EXIT.PRECONDITION;
  }

  const name = projectName(projectRoot);
  writeIntakeFile(projectRoot, { body, source, projectName: name, date: today(), force });
  console.log(c.green("created") + ` ${relPath(projectRoot, intakePath)}`);
  console.log("");
  warnIfThinIntake(body);
  printBootstrapPlaybook(projectRoot);
  return 0;
}


export const help = `
Usage: doctrina intake [<file>] [--text "<description>"] [--force]

Store the full project description verbatim at .doctrina/intake.md and
print the bootstrap playbook — the ordered instruction sequence the host
AI agent executes to convert the intake into product.md content and
capability specs (see ADR 0005). The CLI itself does no natural-language
interpretation. A thin/under-specified description is flagged so the agent
clarifies with the user before converting (advisory, never blocking).

Forms:
  doctrina intake <file>              Ingest a description file
  doctrina intake --text "<text>"     Ingest an inline description
  doctrina intake                     Reprint the playbook for the
                                      existing pending intake
  doctrina intake --converted         Close the bootstrap: flip the stored
                                      intake's Status to converted

Options:
  --text "<description>"   Inline description instead of a file
  --force                  Overwrite an existing .doctrina/intake.md
  --converted              Mark the stored intake converted (ends the
                           bootstrap; nothing else writes that header)

Close the bootstrap with \`doctrina intake --converted\` rather than editing
the header by hand: \`next\` branches on that value, and \`validate\` reports a
Status that is neither pending nor converted, because every other word read
as pending in silence. After conversion the specs are the only source of
truth.
`;

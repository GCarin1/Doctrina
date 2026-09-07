// @ts-check
import path from "node:path";
import process from "node:process";
import { exists, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { listHeader } from "../lib/scan.js";
import { assessBrief } from "../lib/clarity.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { warnIfThinIntake, writeIntakeFile, printBootstrapPlaybook } from "../lib/intake-model.js";

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
export const flags = { boolean: ["json", "force"], string: ["text"] };

export async function run(positional, flags) {
  const projectRoot = process.cwd();
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
    if (!isFile(abs)) {
      console.error(c.red("error:") + ` description file not found: ${sourceFile}`);
      return 1;
    }
    body = read(abs);
    source = relPath(projectRoot, abs);
  }
  if (body.trim().length === 0) {
    console.error(c.red("error:") + " the description is empty");
    return 1;
  }

  if (exists(intakePath) && !force) {
    console.error(c.red("error:") + ` ${relPath(projectRoot, intakePath)} already exists (pass --force to overwrite)`);
    return 1;
  }

  const projectName = idx.load(projectRoot).project ?? path.basename(projectRoot);
  writeIntakeFile(projectRoot, { body, source, projectName, date: today(), force });
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

Options:
  --text "<description>"   Inline description instead of a file
  --force                  Overwrite an existing .doctrina/intake.md

After conversion the agent flips the intake header to
"- **Status:** converted"; specs become the only source of truth.
`;

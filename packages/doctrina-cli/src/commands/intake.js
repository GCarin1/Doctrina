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
import { inventory, inventoryMarkdown } from "../lib/code-inventory.js";
import { printPlaybookTemplate } from "../lib/playbook.js";
import { findWorkspace } from "../lib/workspace.js";

// `init --intake` performs the same operations; they live in
// lib/intake-model.js so neither command imports out of the other (F7).
export { warnIfThinIntake, writeIntakeFile, printBootstrapPlaybook } from "../lib/intake-model.js";
import { collectValidation } from "../lib/validation-model.js";
import { EXIT, notADoctrinaProject } from "../lib/exit-codes.js";

// `intake` is the first half of the no-ceremony path (ADR 0005): store the
// user's FULL project description verbatim, then print the bootstrap
// playbook the host agent executes to convert it into product.md content
// and capability specs. The CLI does no interpretation — it scaffolds and
// instructs; the agent thinks.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json", "force", "converted", "from-code"], string: ["text"] };

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
    // Converting is the claim that the bootstrap is done — step 6 of the
    // playbook, "fix everything the gates report", made checkable (change
    // 0194). It used to convert over a tree `validate` failed, so the specs
    // became "the source of truth" while an error still said they were not
    // well-formed. --force converts anyway, for a tree whose errors are not
    // the bootstrap's to fix.
    if (isFile(path.join(projectRoot, ".doctrina", "intake.md")) && !flagBool(flags, "force", false)) {
      const { errors } = collectValidation(projectRoot);
      if (errors.length > 0) {
        console.error(c.red("error:") + ` the bootstrap is not done — \`doctrina validate\` reports ${errors.length} error${errors.length === 1 ? "" : "s"}:`);
        for (const e of errors.slice(0, 5)) console.error("  - " + e);
        if (errors.length > 5) console.error(`  … and ${errors.length - 5} more`);
        console.error(c.gray("hint: ") + "fix them (`doctrina validate --fix` heals index drift), then rerun; `--force` converts anyway");
        return EXIT.GATE;
      }
    }
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
  if (flagBool(flags, "from-code", false)) return intakeFromCode(projectRoot, force);
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


// An existing codebase becomes specs (change 0221). The intake is the code
// INVENTORY — facts read from manifests and file counts — and the playbook
// asks the agent to describe what the system does today, leaving what the
// code cannot tell to the human as open questions.
function intakeFromCode(projectRoot, force) {
  const intakePath = path.join(projectRoot, ".doctrina", "intake.md");
  if (exists(intakePath)) {
    const status = (listHeader(read(intakePath), "Status") ?? "pending").toLowerCase();
    if (status === "converted") {
      console.error(c.red("error:") + " the intake is already converted — the specs are the source of truth now");
      console.error(c.gray("hint: ") + "a change of behaviour: `doctrina work \"<prompt>\"`");
      return EXIT.PRECONDITION;
    }
    if (!force) {
      console.error(c.red("error:") + ` ${relPath(projectRoot, intakePath)} already exists (pass --force to replace it with the code inventory)`);
      return EXIT.PRECONDITION;
    }
  }
  const name = projectName(projectRoot);
  const inv = inventory(projectRoot);
  writeIntakeFile(projectRoot, {
    body: inventoryMarkdown(inv, name),
    source: "code inventory (`doctrina intake --from-code`)",
    projectName: name, date: today(), force: true,
  });
  console.log(c.green("created") + ` ${relPath(projectRoot, intakePath)} — ${inv.files} files read: ${inv.stack.join(", ") || "no manifest"}; ${inv.tests.files} test files; ${inv.areas.length} candidate areas`);
  console.log("");
  const ws = findWorkspace(projectRoot);
  printPlaybookTemplate(projectRoot, "absorb", {
    WORKSPACE_STEP: ws
      ? `\n8. This project belongs to the workspace at ${ws.dir} — confirm it reads\n   ready: ${c.cyan("doctrina workspace list")}, and commit the workspace.`
      : "",
  });
  return EXIT.OK;
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
  doctrina intake --from-code         An EXISTING codebase: store its code
                                      inventory as the intake and print the
                                      absorb playbook

Options:
  --text "<description>"   Inline description instead of a file
  --force                  Overwrite an existing .doctrina/intake.md; with
                           --converted, convert although validate fails
  --from-code              Inventory the code (stack, tests, CI, env names,
                           candidate areas, build commands) instead of a
                           description; --force replaces a pending intake
  --converted              Mark the stored intake converted (ends the
                           bootstrap; nothing else writes that header).
                           Refuses (exit 1) while validate reports an error

Close the bootstrap with \`doctrina intake --converted\` rather than editing
the header by hand: \`next\` branches on that value, and \`validate\` reports a
Status that is neither pending nor converted, because every other word read
as pending in silence. After conversion the specs are the only source of
truth.
`;

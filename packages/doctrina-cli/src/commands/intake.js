import path from "node:path";
import process from "node:process";
import { exists, isFile, read, relPath, write } from "../lib/fs-ops.js";
import { listHeader } from "../lib/scan.js";
import * as idx from "../lib/index-json.js";
import { today } from "../lib/dates.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";

// `intake` is the first half of the no-ceremony path (ADR 0005): store the
// user's FULL project description verbatim, then print the bootstrap
// playbook the host agent executes to convert it into product.md content
// and capability specs. The CLI does no interpretation — it scaffolds and
// instructs; the agent thinks.

export async function run(positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
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
      return 1;
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
  printBootstrapPlaybook(projectRoot);
  return 0;
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

// Exported so `init --intake` can print the same playbook inline instead
// of bouncing the user to a second command.
export function printBootstrapPlaybook(projectRoot) {
  const hasSpecs = exists(path.join(projectRoot, ".doctrina", "specs"));
  console.log(c.bold("Bootstrap playbook") + c.gray(" — agent-executed (ADR 0005); the CLI does no interpretation."));
  console.log("");
  console.log("Execute in order, in a single linear pass:");
  console.log("");
  console.log(`1. Read ${c.cyan(".doctrina/intake.md")} (raw intent) and ${c.cyan(".doctrina/product.md")}.`);
  console.log("");
  console.log("2. Fill every product.md section from the intake: Vision, Problem,");
  console.log("   Target users, Scope (in/out), Non-goals, Success criteria.");
  console.log("   One fact, one home — product.md holds vision, never requirements.");
  console.log("");
  console.log("3. Derive the capability list: kebab-case, one per area of behaviour");
  console.log("   (e.g. auth, billing, reports). For each capability:");
  console.log(`       ${c.cyan("doctrina spec new <capability>")}`);
  console.log("   then replace the template placeholders in");
  console.log("   .doctrina/specs/<capability>/spec.md with EARS requirements derived");
  console.log("   from the intake (Ubiquitous / Event-driven / State-driven /");
  console.log("   Unwanted-behavior / Optional). Remove section stubs you do not use,");
  console.log("   and write concrete Acceptance criteria.");
  console.log("");
  console.log("4. Record any architectural decision the intake forces:");
  console.log(`       ${c.cyan("doctrina decision new \"<title>\"")} → edit → ${c.cyan("doctrina decision accept <num>")}`);
  console.log("");
  console.log("5. Quality gates — fix everything they report before moving on:");
  console.log(`       ${c.cyan("doctrina clarify --all")}`);
  console.log(`       ${c.cyan("doctrina validate")}`);
  console.log("   If something in the intake is genuinely ambiguous, ask the user");
  console.log("   before assuming.");
  console.log("");
  console.log("6. Mark the intake consumed: in .doctrina/intake.md flip");
  console.log("   \"- **Status:** pending\" to \"- **Status:** converted\".");
  console.log("");
  console.log(`7. ${c.cyan("doctrina next")} — follow the recommendation. Implementation then`);
  console.log(`   flows through ${c.cyan("doctrina work \"<brief prompt>\"")}, one change at a time.`);
  if (!hasSpecs) {
    console.log("");
    console.log(c.yellow("warn:") + " .doctrina/specs/ is missing — re-run `doctrina init` first.");
  }
}

export const help = `
Usage: doctrina intake [<file>] [--text "<description>"] [--force]

Store the full project description verbatim at .doctrina/intake.md and
print the bootstrap playbook — the ordered instruction sequence the host
AI agent executes to convert the intake into product.md content and
capability specs (see ADR 0005). The CLI itself does no natural-language
interpretation.

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

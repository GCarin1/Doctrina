// @ts-check
import path from "node:path";
import process from "node:process";
import { isDir } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { collectValidation } from "../lib/validation-model.js";

// The structural gate. The checks themselves live in lib/validation-model.js
// so a driver can ASK for them instead of spawning this binary and parsing
// its own JSON back (ADR 0025); what stays here is the rendering and the
// exit code.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
// This command builds its own JSON payload; the entrypoint must not
// wrap it in the generic envelope.
export const jsonNative = true;

export const flags = { boolean: ["fix", "json", "runtime", "strict"], string: [] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  // Outside a Doctrina project this is a PRECONDITION, not a pile of
  // gate failures about missing files: the remedy is `doctrina init`,
  // not editing artifacts that do not exist yet (C7).
  if (!isDir(path.join(projectRoot, ".doctrina"))) throw notADoctrinaProject();

  const { errors, warnings, fixes } = collectValidation(projectRoot, {
    fix: flagBool(flags, "fix", false),
    runtime: flagBool(flags, "runtime", false),
  });

  // --strict makes a warning count against the exit code, matching what
  // `--strict` already means on `coverage` and `trace`: fail on any gap.
  //
  // The default has to stay lenient — a warning is advice, and advice that
  // blocks a commit stops being read. But that leniency left a gate that
  // COULD NOT REPROVE: the CI step that validates the shipped examples runs
  // this command, both examples had drifted to warnings, and the step passed
  // green through every run. The EARS defect the retrofit example exists to
  // teach against was reintroduced and sat there, twice, because nothing
  // downstream of `validate` could say no.
  //
  // So the choice belongs to the caller. A human at a terminal wants the
  // advice; a gate wants a verdict.
  const strict = flagBool(flags, "strict", false);
  const failed = errors.length > 0 || (strict && warnings.length > 0);

  // Output
  if (flagBool(flags, "json", false)) {
    emitJson("validate", { errors, warnings, strict });
    return failed ? 1 : 0;
  }
  // The repairs print first and in the order they were made: --fix changes
  // the tree, and what it changed must be visible before what it then found.
  for (const f of fixes) console.log(c.green("fixed") + " " + f);
  for (const w of warnings) console.log(c.yellow("warn:  ") + w);
  for (const e of errors) console.log(c.red("error: ") + e);

  console.log("");
  if (errors.length === 0 && warnings.length === 0) {
    console.log(c.green("ok") + " all validation checks passed");
  } else {
    const summary = `${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`;
    console.log((failed ? c.red("fail") : c.green("ok")) + " " + summary);
    // Say WHY a run with no errors is failing, or the exit code reads as a bug.
    if (strict && errors.length === 0 && warnings.length > 0) {
      console.log(c.gray("       --strict: warnings count against the exit code"));
    }
  }
  return failed ? 1 : 0;
}

export const help = `
Usage: doctrina validate [--fix] [--runtime] [--strict] [--json]

Run schema, artifact-existence, and structural checks against the
.doctrina/ tree in the current working directory. Exits 0 if no errors
(warnings allowed), 1 otherwise. With --strict, a warning fails it too.

Two structural checks worth naming:

  Pipeline    a spec's optional "### Pipeline" block declares ordered
              steps and the artifact each hands on:
                1. run-suite — produces \`results.json\`
                2. analyse — requires \`results.json\`, produces \`analysis.md\`
              A step may only require what an EARLIER step produced.
              EARS states each event-driven requirement independently, so
              without this a consumer and its producer both pass while the
              consumer reads the previous run's file. Mark inputs from
              outside the pipeline \`(external)\`.

  Triggers    a skill whose frontmatter "when:" names nothing concrete
              (no keyword, path, command or error string) can never be
              matched, so nothing ever loads it.

Flags:
  --fix       Rebuild index.json from the tree before checking (heals drift).
  --runtime   Also run the RUNTIME gate: the declared wiring, enums and
              selectors checked against the workflows and code that are
              supposed to honour them (the same checks as \`contract check\`).
              Opt-in because it reads files outside .doctrina/.
  --strict    Treat warnings as failures, the way \`coverage --strict\` and
              \`trace --strict\` already do. The default stays lenient because
              a warning is advice; a GATE wants a verdict, so anything that
              must be able to reprove passes this.
  --json      Emit { ok, errors, warnings, strict } as JSON (stable shape for agents/CI).
`;

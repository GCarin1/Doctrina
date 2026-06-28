import path from "node:path";
import process from "node:process";
import { exists, isFile } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import * as analyze from "./analyze.js";
import * as change from "./change.js";
import * as verify from "./verify.js";
import * as coverage from "./coverage.js";
import * as trace from "./trace.js";
import * as validate from "./validate.js";

// One-command close (review 2026-06-27 passive-user feature #2). The work
// playbook lists the closing sequence — analyze → apply → verify → coverage →
// trace → archive → validate — and the agent runs it step by step, which is
// exactly where a gate gets skipped. `close` runs the whole sequence in one
// pass, in-process, stopping at the first failure with the exact command to
// rerun, so the agent makes one call and the human approves once. It is a
// driver over the existing commands; it adds no new checks of its own.

export async function run(positional, flags) {
  const id = positional[0];
  if (!id) {
    console.error(c.red("error:") + " close requires a change <id> (e.g. doctrina close 0001-add-login)");
    return 2;
  }
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  const force = flagBool(flags, "force", false);
  const strict = new Map([["strict", true]]);
  const archiveFlags = force ? new Map([["force", true]]) : new Map();

  // Each step: a label, the command that runs it, and the literal command to
  // rerun on failure. verify is conditional (skipped, with a loud note, when no
  // verify.json is declared — a project may not have wired the real gate yet).
  const verifyConfigured = isFile(path.join(projectRoot, ".doctrina", "verify.json"));
  const steps = [
    { label: "analyze", rerun: `doctrina analyze ${id}`, run: () => analyze.run([id], new Map()) },
    { label: "apply", rerun: `doctrina change apply ${id}`, run: () => change.run(["apply", id], new Map()) },
    verifyConfigured
      ? { label: "verify", rerun: "doctrina verify", run: () => verify.run([], new Map()) }
      : { label: "verify", skip: "no .doctrina/verify.json — declare the real gate with `doctrina verify --init`" },
    { label: "coverage", rerun: "doctrina coverage --strict", run: () => coverage.run([], strict) },
    // trace is advisory (provenance is a warning, not a hard gate): report it,
    // never let it block the close.
    { label: "trace", rerun: "doctrina trace", run: async () => { await trace.run([], new Map()); return 0; } },
    { label: "archive", rerun: `doctrina change archive ${id}${force ? " --force" : ""}`, run: () => change.run(["archive", id], archiveFlags) },
    { label: "validate", rerun: "doctrina validate", run: () => validate.run([], new Map()) },
  ];

  console.log(c.bold(`Closing change ${id}`) + c.gray(" — analyze → apply → verify → coverage → trace → archive → validate"));

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log("");
    console.log(c.gray(`──── ${i + 1}/${steps.length} ${step.label}`));
    if (step.skip) {
      console.log(c.yellow("skip   ") + step.skip);
      continue;
    }
    let code;
    try {
      code = await step.run();
    } catch (err) {
      code = 1;
      console.error(c.red("error:") + ` ${err.message}`);
    }
    if (code !== 0) {
      console.log("");
      console.log(c.red(`✗ close stopped at "${step.label}"`) + c.gray(` (step ${i + 1}/${steps.length})`));
      console.log(c.gray("Fix it, then rerun the step or the whole close:"));
      console.log(`    ${c.cyan(step.rerun)}`);
      console.log(`    ${c.cyan(`doctrina close ${id}`)}`);
      return 1;
    }
  }

  console.log("");
  console.log(c.green(`✓ change ${id} closed`) + c.gray(" — verified, archived, and validated."));
  console.log(c.gray("Next: ") + c.cyan("doctrina next"));
  return 0;
}

export const help = `
Usage: doctrina close <id> [--force]

Run the whole closing sequence for a change in one pass, stopping at the
first failure with the exact command to rerun:

  analyze → change apply → verify → coverage --strict → trace → change
  archive → validate

verify is skipped (with a note) when no .doctrina/verify.json is declared;
trace is advisory (a report, never a blocker). This is a driver over the
existing commands — it adds no checks of its own — so the agent makes one
call instead of seven and the human approves once.

Options:
  --force    Pass through to \`change archive\` (archive even if verification
             is incomplete; records the gap).
`;

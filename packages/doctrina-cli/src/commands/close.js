import path from "node:path";
import process from "node:process";
import { exists, isFile, read, walk } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { parseCapabilityFromDelta } from "./change.js";
import { printAdrCheckpoint } from "../lib/adr-guard.js";
import * as analyze from "./analyze.js";
import * as change from "./change.js";
import * as verify from "./verify.js";
import * as coverage from "./coverage.js";
import * as trace from "./trace.js";
import * as validate from "./validate.js";
import * as skill from "./skill.js";

// One-command close (review 2026-06-27 passive-user feature #2). The work
// playbook lists the closing sequence — analyze → apply → verify → coverage →
// trace → archive → validate — and the agent runs it step by step, which is
// exactly where a gate gets skipped. `close` runs the whole sequence in one
// pass, in-process, stopping at the first failure with the exact command to
// rerun, so the agent makes one call and the human approves once. It is a
// driver over the existing commands; it adds no new checks of its own.

export async function run(positional, flags) {
  if (positional.length === 0) {
    console.error(c.red("error:") + " close requires a change <id> (e.g. doctrina close 0001-add-login)");
    return 2;
  }
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  // Batch close (operator review 2026-07-19 §4.5): each id closes
  // independently, worst exit code wins, so a 9-change implementation lot is
  // one command, not nine.
  let worst = 0;
  for (const id of positional) {
    if (positional.length > 1) {
      console.log("");
      console.log(c.bold(`════ close ${id}`));
    }
    worst = Math.max(worst, await closeOne(projectRoot, id, flags));
  }
  if (positional.length > 1) {
    console.log("");
    console.log(worst === 0
      ? c.green("ok") + ` all ${positional.length} changes closed`
      : c.red("fail") + " at least one close stopped — see above");
  }
  return worst;
}

async function closeOne(projectRoot, id, flags) {
  const force = flagBool(flags, "force", false);
  const archiveFlags = force ? new Map([["force", true]]) : new Map();

  // Scope the coverage gate to the capabilities THIS change touches (its
  // deltas), so one deliberately deferred spec elsewhere in the tree cannot
  // block closing a change that never went near it (0.11.0 field review
  // item 4). A change with no deltas (chore / metadata-only) falls back to
  // the whole-tree gate — there is no narrower honest scope for it.
  const touched = touchedCapabilities(projectRoot, id);
  const coverageFlags = new Map([["strict", true]]);
  let coverageRerun = "doctrina coverage --strict";
  if (touched.length > 0) {
    coverageFlags.set("only", touched.join(","));
    coverageRerun = `doctrina coverage --strict --only ${touched.join(",")}`;
  }

  // Each step: a label, the command that runs it, and the literal command to
  // rerun on failure. verify is conditional (skipped, with a loud note, when no
  // verify.json is declared — a project may not have wired the real gate yet).
  const verifyConfigured = isFile(path.join(projectRoot, ".doctrina", "verify.json"));
  const steps = [
    { label: "analyze", rerun: `doctrina analyze ${id}`, run: () => analyze.run([id], new Map()) },
    // ADR checkpoint (operator review §4.6): the playbook's "record an ADR"
    // step was skippable in silence. Advisory — it names the accepted ADRs
    // whose text cites the touched capabilities and the amend commands, but
    // an ADR merely mentioning a capability is normal, so it never blocks.
    {
      label: "ADR checkpoint (advisory)",
      rerun: "doctrina decision list",
      run: async () => {
        if (printAdrCheckpoint(projectRoot, touched, { c }) === 0) {
          console.log(c.green("ok") + " no accepted ADR cites the touched capabilities");
        }
        return 0;
      },
    },
    { label: "apply", rerun: `doctrina change apply ${id}`, run: () => change.run(["apply", id], new Map()) },
    verifyConfigured
      ? { label: "verify", rerun: "doctrina verify", run: () => verify.run([], new Map()) }
      : { label: "verify", skip: "no .doctrina/verify.json — declare the real gate with `doctrina verify --init`" },
    {
      label: touched.length > 0 ? `coverage (scoped: ${touched.join(", ")})` : "coverage",
      rerun: coverageRerun,
      run: () => coverage.run([], coverageFlags),
    },
    // trace is advisory (provenance is a warning, not a hard gate): report it,
    // never let it block the close.
    { label: "trace", rerun: "doctrina trace", run: async () => { await trace.run([], new Map()); return 0; } },
    { label: "archive", rerun: `doctrina change archive ${id}${force ? " --force" : ""}`, run: () => change.run(["archive", id], archiveFlags) },
    { label: "validate", rerun: "doctrina validate", run: () => validate.run([], new Map()) },
  ];

  console.log(c.bold(`Closing change ${id}`) + c.gray(" — analyze → ADR checkpoint → apply → verify → coverage → trace → archive → validate"));

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

  // Capture the lesson while it is fresh (operator review §4.7): surface the
  // fix-shaped lessons not yet written as skills, right where the operator
  // just proved they finish what they start. Advisory — a listing, never a
  // gate, and a suggest failure never un-closes the change.
  console.log("");
  console.log(c.gray("──── skills (advisory)"));
  try {
    await skill.run(["suggest"], new Map());
  } catch { /* advisory only */ }

  console.log("");
  console.log(c.green(`✓ change ${id} closed`) + c.gray(" — verified, archived, and validated."));
  console.log(c.gray("Next: ") + c.cyan("doctrina next"));
  return 0;
}

// The capabilities this change's deltas target — the honest scope for its
// coverage gate. Read from the change folder's specs/**/delta.md files.
function touchedCapabilities(projectRoot, id) {
  const specsDir = path.join(projectRoot, ".doctrina", "changes", id, "specs");
  const caps = new Set();
  for (const deltaPath of walk(specsDir)) {
    if (!deltaPath.endsWith("delta.md")) continue;
    const cap = parseCapabilityFromDelta(read(deltaPath), deltaPath);
    if (cap) caps.add(cap);
  }
  return [...caps].sort();
}

export const help = `
Usage: doctrina close <id...> [--force]

Run the whole closing sequence for a change in one pass, stopping at the
first failure with the exact command to rerun:

  analyze → ADR checkpoint (advisory) → change apply → verify → coverage
  --strict (scoped to the change's touched capabilities) → trace → change
  archive → validate → skill suggest (advisory)

The coverage gate is scoped to the capabilities the change's deltas touch,
so a deliberately deferred spec elsewhere cannot block an unrelated close;
a change with no deltas gates on the whole tree. verify is skipped (with a
note) when no .doctrina/verify.json is declared; trace, the ADR checkpoint
(accepted ADRs citing the touched capabilities — amend via \`decision
supersede\`, not silence), and the closing skill-suggest listing are
advisory (reports, never blockers). This is a driver over the existing
commands so the agent makes one call instead of nine and the human
approves once.

Multiple ids close in sequence, each independently; the exit code is the
worst per-id result. Preview what close would refuse: \`doctrina change
check <id>\`.

Options:
  --force    Pass through to \`change archive\` (archive even if verification
             is incomplete; records the gap).
`;

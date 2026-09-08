// @ts-check
import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { EXIT } from "../lib/exit-codes.js";
import { action, computeActions, invocation } from "../lib/actions.js";

// `next` answers "what now?". The ANSWER lives in `lib/actions.js` as
// records; this module renders them and, under `--run`, executes one
// (change 0032). Before that the answer WAS the sentence, so `--json`
// returned prose in quotes and an agent had to re-read English to re-issue
// a command the CLI had already assembled.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
// This command builds its own JSON payload; the entrypoint must not
// wrap it in the generic envelope.
export const jsonNative = true;

export const flags = { boolean: ["json", "run"], string: [] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  const json = flagBool(flags, "json", false);
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    const first = action({
      id: "not-a-project",
      command: "init",
      runnable: false,
      why: "this directory is not a Doctrina project yet",
    });
    if (json) emitJson("next", { actions: [first] });
    else console.log(`1. ${first.text}`);
    return 0;
  }

  const actions = computeActions(projectRoot);

  if (flagBool(flags, "run", false)) {
    return runFirst(actions);
  }

  if (json) {
    emitJson("next", { actions });
    return 0;
  }

  if (actions.length === 0) {
    // The two doors AGENTS.md tells an agent to use, not the two hand-authoring
    // commands it tells them to avoid (second audit). `intake` first for a
    // project with nothing specced yet, `work` for one that has.
    const specced = isDir(path.join(projectRoot, ".doctrina", "specs"))
      && readdirSync(path.join(projectRoot, ".doctrina", "specs"), { withFileTypes: true })
        .some((e) => e.isDirectory());
    console.log(c.green("ok") + " every gate is satisfied and no change is open.");
    console.log("");
    console.log("Start something:");
    if (!specced) {
      console.log(`  doctrina intake --text "<what this project is>"   turn intent into specs`);
    }
    console.log(`  doctrina work "<prompt>"                          open the next change`);
    return 0;
  }

  console.log(c.bold("Next actions") + c.gray(" (in priority order):"));
  console.log("");
  actions.forEach((a, i) => console.log(`${i + 1}. ${a.text}`));
  return 0;
}

// The command modules `--run` may dispatch to, loaded on demand. Static
// imports here would make every module that imports `next` (prime, handoff,
// watch) pay for the whole command tree just to render a list.
export const RUNNERS = {
  triage: () => import("./triage.js"),
  intake: () => import("./intake.js"),
  analyze: () => import("./analyze.js"),
  "change apply": () => import("./change.js"),
  "change archive": () => import("./change.js"),
  "index rebuild": () => import("./index-rebuild.js"),
};

/**
 * Execute the first runnable action, and only that one.
 *
 * ONE action, not the queue: the list is recomputed from the tree after
 * every change to it, so running two in a row would act on a list the
 * second half of which was computed before the first half ran. Stopping
 * also keeps the human's approval point where they put it — `close` is the
 * command that deliberately runs a whole sequence.
 */
async function runFirst(actions) {
  const next = actions.find((a) => a.runnable);
  if (!next) {
    const blocked = actions.find((a) => !a.runnable);
    if (!blocked) {
      console.log(c.green("ok") + " no open work to run.");
      return EXIT.OK;
    }
    // Everything left needs authorship, not execution. Say what, and say
    // it is not a failure of the command.
    console.log(c.yellow("nothing to run") + " — the next action needs a person, not a command:");
    console.log("");
    console.log(`    ${blocked.text}`);
    const inv = invocation(blocked);
    if (inv) {
      console.log("");
      console.log(c.gray("When you have made the call, record it with: ") + c.cyan(inv));
    }
    return EXIT.OK;
  }

  const loader = RUNNERS[next.command];
  if (!loader) {
    // A runnable action whose command has no runner is a bug in this map,
    // not something to paper over by silently doing nothing.
    console.error(c.red("error:") + ` no runner for "${next.command}"`);
    console.error(c.gray("hint: ") + `run it yourself: ${invocation(next)}`);
    return EXIT.GATE;
  }

  console.log(c.bold("Running") + ` ${c.cyan(invocation(next))}` + c.gray(` — ${next.why}`));
  console.log("");
  const mod = await loader();
  // A sub-operation ("change archive") is passed as a positional, exactly
  // as the entrypoint would.
  const [, ...sub] = next.command.split(" ");
  const code = await mod.run([...sub, ...next.args], new Map());

  console.log("");
  if (code === EXIT.OK) {
    console.log(c.green("✓ ran ") + c.cyan(invocation(next)) + c.gray(" — `doctrina next` for what follows"));
  } else {
    console.log(c.red("✗ ") + c.cyan(invocation(next)) + c.gray(` exited ${code} — fix it, then rerun`));
  }
  return code;
}

export const help = `
Usage: doctrina next [--json] [--run]

Inspect the .doctrina/ tree and print the recommended next workflow
actions in priority order: runtime declarations that no longer hold
(a broken wiring outranks every artifact chore — it is why the last
run lied), open changes (missing proposal, unchecked
tasks, deltas ready to apply, applied-but-unarchived), ADRs still in
proposed status, accepted ADRs with nothing proving them (cite Evidence
or run "decision land"), a skill-capture nudge when a past fix went
uncaptured, and index drift last.

Intended use: agents and humans run it to resume work without
re-reading the whole tree.

Options:
  --json   Emit the actions as records — { id, command, args, why, gate,
           severity, runnable, text }. Branch on \`command\`/\`args\`; \`text\`
           is the same line the terminal prints.
  --run    Execute the first RUNNABLE action in-process and stop. An action
           that needs a person to decide — accept an ADR, write a proposal,
           complete a task, capture a skill — is never runnable however
           mechanical its edit would be, and \`--run\` names it instead.
           Exits with the executed command's own code.

Read-only without --run, and always exits 0 then.
`;

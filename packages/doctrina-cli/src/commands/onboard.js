// @ts-check
import process from "node:process";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { EXIT } from "../lib/exit-codes.js";
import { TRACKS } from "../lib/triage-model.js";
import { firstTaskCandidates, onboardState, onboardSteps, tourLines } from "../lib/onboard.js";

// `onboard` walks the whole cycle once, on this repository (change 0256).
// It reads where the project stands and prints the walk; the agent is the
// guide and the human the one being shown. It writes nothing and works
// before `init`, because the first step is the install.

export const jsonNative = true;

export const flags = { boolean: ["json"], string: [] };

export async function run(_positional, cmdFlags) {
  const projectRoot = process.cwd();
  const state = onboardState(projectRoot);
  const { steps, current } = onboardSteps(state);
  const wantsCandidates = current === "first-task" && state.installed;
  const candidates = wantsCandidates ? firstTaskCandidates(projectRoot) : [];

  if (flagBool(cmdFlags, "json", false)) {
    emitJson("onboard", {
      current,
      steps: steps.map((s) => ({ id: s.id, title: s.title, done: s.done, run: s.run, ask: s.ask || null })),
      candidates,
      closed: state.closed,
    });
    return EXIT.OK;
  }

  console.log(c.bold("Doctrina onboarding") + c.gray(" — the whole cycle once, on this repository"));
  console.log("");
  console.log("You are the guide. Do the step marked →, say in one sentence what it did,");
  console.log("stop where it says ASK, then run `doctrina onboard` again: it reads the tree.");
  console.log("");
  steps.forEach((s, i) => {
    const mark = s.done ? c.green("✓") : (s.id === current ? c.cyan("→") : " ");
    console.log(`  ${mark} ${i + 1}. ${s.done ? s.title.padEnd(31) + c.gray(s.evidence) : s.title}`);
  });
  console.log("");

  if (current === null) {
    console.log(c.bold("The cycle has run here") + c.gray(` — ${state.closed} change${state.closed === 1 ? "" : "s"} closed. For someone new to the project:`));
    console.log("");
    for (const line of tourLines(state)) console.log(`  ${line}`);
    console.log("");
    printTracks();
    return EXIT.OK;
  }

  const at = steps.findIndex((s) => s.id === current);
  const step = steps[at];
  console.log(c.bold(`Step ${at + 1} — ${step.title}`));
  console.log(`  ${c.gray("Tell the human:")} ${step.say}`);
  if (wantsCandidates) {
    console.log("");
    if (candidates.length === 0) {
      console.log(c.gray("  No candidate stands out in this repository (every criterion cites proof, no TODO in the code)."));
    } else {
      console.log("  Candidates read from this repository:");
      for (const cand of candidates) console.log(`    - ${cand.where.padEnd(24)} ${cand.text}`);
    }
  }
  const after_ = "askAfter" in step && step.askAfter === true;
  if (step.ask && !after_) console.log(`  ${c.yellow("ASK")} the human ${step.ask}`);
  console.log(step.ask && !after_ ? "  Then run:" : "  Run:");
  for (const cmd of step.run) console.log(`    ${c.cyan(cmd)}`);
  if (step.ask && after_) console.log(`  Then ${c.yellow("ASK")} the human ${step.ask}`);
  if (current === "first-task") {
    console.log("");
    printTracks();
  }
  const after = steps[at + 1];
  if (after) console.log(c.gray(`\nAfter it: step ${at + 2}, ${after.title.toLowerCase()} — \`doctrina onboard\` shows it.`));
  return EXIT.OK;
}

function printTracks() {
  console.log(c.gray("Not every edit is a change — the tracks, by what a request changes:"));
  for (const t of TRACKS) console.log(c.gray(`  ${t.id.padEnd(7)} ${t.changes}`));
}

export const help = `
Usage: doctrina onboard [--json]

Walk the whole Doctrina cycle once, on this repository. Prints the six
steps — install, describe the project, pick a first task and open it,
write the delta and the tasks, implement and prove, close — each marked
done when the tree says so, and for the first one that is not: what to
tell the human, where to stop and ask, and the commands to run. Run it
again after each step; it stores nothing and reads the tree every time.

At "pick a first task" it lists candidates read from the repository: an
acceptance criterion that cites no proof (or a proof that is missing),
then a TODO or FIXME left in the code. They are suggestions; the human
chooses, or names a task of their own.

In a project that already closed a change, every step is done and it
prints the tour for someone new to the project instead: the commands to
read the project with, and the last closed change as a worked example.

It works before \`doctrina init\` (the first step is the install) and
writes nothing.

Options:
  --json    Machine-readable: the steps with their state, the current
            step, and the first-task candidates
`;

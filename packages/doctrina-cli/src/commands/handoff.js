// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { collectStatus } from "./status.js";
import { computeActions } from "./next.js";
import { openChanges } from "./prime.js";
import { today } from "../lib/dates.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";

// Session handoff note: everything the NEXT session (a fresh agent, a
// teammate, tomorrow's you) needs to resume without re-reading the tree —
// where the open work stands task-by-task, which gates are red, and the
// exact command to continue with. Doctrina's thesis is that context must
// survive across sessions; this command is that thesis for the in-flight
// change. It is a VIEW derived from the tree at call time, deliberately not
// a stored file: a saved note goes stale the moment work continues, the
// tree never does (no new home for facts).

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
export const flags = { boolean: ["json"], string: [] };

export async function run(_positional, _flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  const s = collectStatus(projectRoot);
  const open = openChanges(projectRoot);
  const actions = computeActions(projectRoot);

  console.log(`# Doctrina handoff — ${s.project} (${today()})`);
  console.log("");

  // Gate digest — the red ones are what the resuming session fixes first.
  console.log("## Where things stand");
  console.log("");
  console.log(`- index: ${s.indexState} · framework stamp: ${s.stamp ?? "—"} (CLI ${s.cli})`);
  console.log(`- coverage: ${s.coverage.pct}% (${s.coverage.totalCovered}/${s.coverage.totalCriteria} criteria` +
    (s.coverage.totalDangling ? `, ${s.coverage.totalDangling} dangling` : "") +
    (s.coverage.totalConditional ? `, ${s.coverage.totalConditional} conditional` : "") + ")");
  const tr = s.trace.anchors === 0 ? "no anchors declared" : `${s.trace.realized}/${s.trace.anchors} anchors realized`;
  console.log(`- trace: ${tr}` + (s.trace.untraceable ? ` (${s.trace.untraceable} untraceable)` : ""));
  console.log(`- verify: ${s.verify.configured ? `${s.verify.checks} checks declared — run \`doctrina verify\`` : "not configured"}`);

  // The in-flight work, task by task.
  console.log("");
  if (open.length === 0) {
    console.log("## Open work");
    console.log("");
    console.log("- none — the tree is at rest; start with `doctrina work \"<prompt>\"`");
  } else {
    for (const ch of open) {
      console.log(`## Open change \`${ch.id}\`${ch.title ? ` — ${ch.title}` : ""}`);
      console.log("");
      console.log(`- proposal status: ${ch.status}`);
      if (ch.tasksTotal > 0) {
        console.log(`- tasks: ${ch.tasksDone}/${ch.tasksTotal} checked`);
        for (const t of ch.unchecked.slice(0, 8)) console.log(`  - [ ] ${t}`);
        if (ch.unchecked.length > 8) console.log(`  - … ${ch.unchecked.length - 8} more in tasks.md`);
      } else {
        console.log("- tasks: no tasks.md checklist found");
      }
      console.log(`- resume with: \`doctrina work --resume ${ch.id}\` · close with: \`doctrina close ${ch.id}\``);
      console.log("");
    }
  }

  // What to do, in priority order.
  console.log("## Next actions");
  console.log("");
  if (actions.length === 0) {
    console.log("1. nothing pending — `doctrina next` will confirm; pick up new work");
  } else {
    actions.forEach((a, i) => console.log(`${i + 1}. ${a}`));
  }

  console.log("");
  console.log("*Generated read-only from the tree — regenerate anytime with `doctrina handoff`.*");
  if (process.stdout.isTTY) {
    console.log("");
    console.log(c.gray("tip: pipe it — `doctrina handoff > note.md` — or paste it as the first message of the next session"));
  }
  return 0;
}

export const help = `
Usage: doctrina handoff

Print a session handoff note in Markdown: gate digest, each open change
with its task-by-task progress and the exact resume command, and the
prioritised next actions. Made to be pasted as the first message of the
next agent session (or piped to a file).

Deliberately a derived view, not a stored file — the tree is the truth
and never goes stale; regenerate on demand. Read-only; always exits 0.
`;

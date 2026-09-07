// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { collectSnapshot, collectStatus } from "../lib/snapshot.js";
import { renderView, VIEWS } from "../lib/views.js";
import { gitWindow, windowCutoff } from "../lib/git.js";
import { suggest } from "../lib/suggest.js";

// One-glance project health (review 2026-06-27 passive-user feature #1): a
// dashboard that answers "where do things stand?" in a single read, so neither
// the human nor the agent has to run validate + coverage + trace + next
// separately. Strictly read-only; never mutates and always exits 0.
//
// Since change 0037 this is also the HOME of the other read-only views:
// `--view prime|handoff|report` renders the same snapshot in a different
// shape. `prime`, `handoff` and `report` remain as their own commands (they
// are what AGENTS.md tells an agent to run) and delegate straight here, so
// there is one collector, one set of formatters, and no way for the four to
// report different numbers (audit finding F7).

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
// This command builds its own JSON payload; the entrypoint must not
// wrap it in the generic envelope.
export const jsonNative = true;

export const flags = { boolean: ["json"], string: ["view", "since"] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  const view = flagString(flags, "view") ?? "dashboard";
  if (!VIEWS.includes(view)) {
    console.error(c.red("error:") + ` unknown view "${view}"`);
    const guess = suggest(view, VIEWS);
    console.error(c.gray("hint: ") + (guess ? `did you mean --view ${guess}?` : `available: ${VIEWS.join(", ")}`));
    return 2;
  }

  // --json always answers with the status shape, whatever the view: the
  // envelope is a machine contract and must not change with a formatting flag.
  if (flagBool(flags, "json", false)) {
    emitJson("status", collectStatus(projectRoot));
    return 0;
  }

  const options = {};
  if (view === "report") {
    const sinceRaw = flagString(flags, "since") ?? "7";
    const days = Number.parseInt(sinceRaw, 10);
    if (!Number.isFinite(days) || days <= 0) {
      console.error(c.red("error:") + ` --since expects a positive day count, got "${sinceRaw}"`);
      return 2;
    }
    options.days = days;
    options.cutoffIso = windowCutoff(days);
    options.git = gitWindow(projectRoot, days);
  }

  const snapshot = collectSnapshot(projectRoot);
  for (const line of renderView(view, snapshot, options)) console.log(line);
  return 0;
}

export const help = `
Usage: doctrina status [--view <name>] [--since <days>] [--json]

Print a one-glance health dashboard for the .doctrina/ project: the gate
signals (index drift, framework stamp, coverage %, trace anchors, whether
verify is configured) and the artifact counts (specs by implementation
state, open changes, decisions, skills). Read-only; always exits 0.

Flags:
  --view <name>   Render a different shape of the same snapshot:
                    dashboard  the default one-glance health board
                    prime      the session primer (\`doctrina prime\`)
                    handoff    the Markdown resume note (\`doctrina handoff\`)
                    report     the period digest (\`doctrina report\`)
  --since <days>  With --view report: the window (default 7).
  --json          Emit the snapshot as JSON (stable shape for agents and CI).

All four views read ONE collection of the tree, so they can never report
different numbers; \`prime\`, \`handoff\` and \`report\` are the same views
under their own names.

It is a fast summary, not the authoritative gate: run \`doctrina validate\`
and \`doctrina verify\` for the full structural and build checks, and
\`doctrina next\` for the recommended next action.
`;

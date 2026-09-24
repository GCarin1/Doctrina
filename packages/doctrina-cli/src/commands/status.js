// @ts-check
import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import { flagBool, flagString, parsePositiveInt } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";
import { collectSnapshot, collectStatus, collectReportWindow } from "../lib/snapshot.js";
import { renderView, VIEWS } from "../lib/views.js";
import { draftAgentChangelog, renderDraft } from "../lib/agent-changelog.js";
import { cliVersion } from "../lib/version.js";
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

// The snapshot's views, plus the one draft that is not a view of it.
const STATUS_VIEWS = [...VIEWS, "agent-changelog"];

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }

  const view = flagString(flags, "view") ?? "dashboard";
  if (!STATUS_VIEWS.includes(view)) {
    console.error(c.red("error:") + ` unknown view "${view}"`);
    const guess = suggest(view, STATUS_VIEWS);
    console.error(c.gray("hint: ") + (guess ? `did you mean --view ${guess}?` : `available: ${STATUS_VIEWS.join(", ")}`));
    return 2;
  }

  // --json always answers with the status shape, whatever the view: the
  // envelope is a machine contract and must not change with a formatting flag.
  if (flagBool(flags, "json", false)) {
    emitJson("status", collectStatus(projectRoot));
    return 0;
  }

  let options = {};
  if (view === "report" || view === "agent-changelog") {
    const sinceRaw = flagString(flags, "since");
    const days = parsePositiveInt(sinceRaw ?? "7");
    if (days === null) {
      console.error(c.red("error:") + ` --since expects a positive day count, got "${sinceRaw}"`);
      return 2;
    }
    // A DRAFT of the block `upgrade --write` writes into AGENTS.md, proposed
    // from what the archived changes said they touched. Not a view of the
    // snapshot, so it renders here; authorship stays human (ADR 0005). With
    // no --since the window is "since the last tag".
    if (view === "agent-changelog") {
      const draft = draftAgentChangelog(projectRoot, { days: sinceRaw === undefined ? null : days });
      for (const line of renderDraft(draft, cliVersion())) console.log(line);
      return 0;
    }
    options = collectReportWindow(projectRoot, days);
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
                    report     the period digest: gates, archived changes,
                               open work, and local git numbers
                    rules      the standing rules (\`doctrina prime --rules\`)
                    agent-changelog
                               a DRAFT of the AGENTS.md "What changed" block:
                               one bullet per archived change that touched a
                               documented surface, newest first, at most five.
                               It proposes; a person cuts and rewrites.
  --since <days>  With --view report: the window (default 7). With
                  --view agent-changelog: the window (default: since the
                  last tag).
  --json          Emit the snapshot as JSON (stable shape for agents and CI).

The views read ONE collection of the tree, so they can never report
different numbers; \`prime\` and \`handoff\` are the same views under their
own names. \`doctrina report\` is deprecated: it is \`--view report\`.

It is a fast summary, not the authoritative gate: run \`doctrina validate\`
and \`doctrina verify\` for the full structural and build checks, and
\`doctrina next\` for the recommended next action.
`;

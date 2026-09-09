// @ts-check
// Audit item M8: instrument the command surface before shrinking it.
//
// How big the surface is, this module does not say: `COMMAND_NAMES` and
// `OPERATIONS` in lib/commands.js own that number, and a copy of it here
// would be one more count to rot (change 0059 found four, all disagreeing).
// The audit's charge is that some of those commands exist because they were
// easy to add, not because anybody reaches for them — and the honest way to
// find out which is to MEASURE, not to guess from the outside. Guessing is how `prime`, `handoff` and
// `doctor` were nearly cut in 0.13.0, right before the operator review
// found they had gone unused only because AGENTS.md never named them.
//
// The design constraints this is built under:
//
//   OFF unless asked.  No file appears, and nothing is recorded, until the
//     operator sets DOCTRINA_USAGE_LOG. A tool that starts logging because
//     it was updated has broken faith regardless of what it logs.
//   LOCAL only.  One append-only JSONL file at a path the operator names.
//     The CLI makes no network calls at all (a spec requirement), and this
//     changes nothing about that.
//   NO ARGUMENTS.  The command and the sub-operation, never the values.
//     `change apply 0021-secret-project` records `change apply`. Paths,
//     titles, prompts and ids are the user's, not the instrument's.
//   NEVER FATAL.  A failure to record is silent. Losing a usage sample
//     matters less than nothing, and losing the command's real work to an
//     instrumentation error would be absurd.

import { appendFileSync } from "node:fs";
import process from "node:process";

export const USAGE_ENV = "DOCTRINA_USAGE_LOG";

// Which operation was invoked, with no user data attached.
//
// The second positional is kept ONLY when the catalog says this command has
// that sub-operation. Shape alone is not enough to tell a sub-command from
// an argument: `context cli` and `spec new` are identical in shape, but the
// first is a capability name. Guessing recorded `context cli` as an
// operation and left the real `context` looking unused — which is exactly
// the wrong answer from an instrument whose whole job is deciding what
// nobody uses.
export function operationOf(positional, knownOperations) {
  const command = positional[0];
  if (!command) return null;
  const next = positional[1];
  if (typeof next !== "string" || !/^[a-z][a-z-]{1,20}$/.test(next)) return command;
  const pair = `${command} ${next}`;
  return knownOperations?.has(pair) ? pair : command;
}

// Append one sample. Returns true when it recorded, false otherwise — the
// tests assert on that rather than on the file, so the "off by default"
// guarantee is checked directly.
export function recordUsage(positional, exitCode, knownOperations, env = process.env) {
  const target = env[USAGE_ENV];
  if (!target) return false;
  const operation = operationOf(positional, knownOperations);
  if (!operation) return false;
  try {
    appendFileSync(target, JSON.stringify({
      at: new Date().toISOString(),
      operation,
      exit: exitCode ?? 0,
    }) + "\n");
    return true;
  } catch {
    // Instrumentation never breaks the command it is measuring.
    return false;
  }
}

// Summarise a usage log: how often each operation ran, and — the number the
// shrink decision actually turns on — which catalog operations never ran at
// all. An operation with zero samples is a CANDIDATE for cutting or
// folding, never a verdict: a command used once a quarter (`init`) and a
// command nobody wants look identical over one week.
export function summarise(logText, catalogOperations) {
  const counts = new Map();
  let samples = 0;
  for (const line of String(logText).split("\n")) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    if (!row?.operation) continue;
    counts.set(row.operation, (counts.get(row.operation) ?? 0) + 1);
    samples += 1;
  }
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const unused = catalogOperations.filter((op) => !counts.has(op)).sort();
  return { samples, used, unused };
}

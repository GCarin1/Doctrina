// @ts-check
import path from "node:path";
import { exists, read, write } from "./fs-ops.js";
import { git, GIT_STATE } from "./git.js";

// WHAT A REPOSITORY NEEDS SO TWO BRANCHES MERGE THEIR ARTIFACTS (change 0242).
//
// Two files are rewritten by every change, so two branches always meet on
// them: `index.json`, which is derived, and the ledger, which is a list.
// `.gitattributes` names how each merges — it is committed, so every clone
// reads it — and the index's driver is a command, which git keeps in the
// clone's own config: `doctrina hooks install` writes both.

export const MERGE_DRIVER = "doctrina-index";
export const ATTRIBUTE_LINES = [
  `**/.doctrina/index.json merge=${MERGE_DRIVER}`,
  "**/.doctrina/changes/archive/LEDGER.md merge=union",
];
const HEADING = "# Doctrina: the derived index merges as data, the ledger as a list (`doctrina hooks install`)";

/** The lines `.gitattributes` still lacks, in order. */
export function missingAttributes(projectRoot) {
  const file = path.join(projectRoot, ".gitattributes");
  const have = exists(file) ? read(file).split(/\r?\n/).map((l) => l.trim()) : [];
  return ATTRIBUTE_LINES.filter((line) => !have.includes(line));
}

/** Append the missing lines to `.gitattributes`. Returns how many were added. */
export function writeAttributes(projectRoot) {
  const missing = missingAttributes(projectRoot);
  if (missing.length === 0) return 0;
  const file = path.join(projectRoot, ".gitattributes");
  const before = exists(file) ? read(file) : "";
  const eol = before.includes("\r\n") ? "\r\n" : "\n";
  const gap = before === "" || before.endsWith("\n") ? "" : eol;
  const head = before.includes(HEADING) ? [] : [HEADING];
  write(file, before + gap + (before === "" ? "" : eol) + [...head, ...missing].join(eol) + eol, { force: true });
  return missing.length;
}

/** The driver command this clone runs for the index, or null when it has none. */
export function configuredDriver(projectRoot) {
  const r = git(projectRoot, ["config", "--get", `merge.${MERGE_DRIVER}.driver`]);
  return r.state === GIT_STATE.OK && r.stdout.trim() !== "" ? r.stdout.trim() : null;
}

/**
 * Point this clone's merge driver at `command` (the CLI, pinned by path as
 * the hook is). Returns false when git refused.
 */
export function configureDriver(projectRoot, command) {
  const set = (/** @type {string} */ k, /** @type {string} */ v) =>
    git(projectRoot, ["config", `merge.${MERGE_DRIVER}.${k}`, v]).state === GIT_STATE.OK;
  return set("name", "Doctrina index merge") && set("driver", `${command} index merge %O %A %B`);
}

// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, move, read, walk, write } from "./fs-ops.js";
import { parseLedger } from "./ledger.js";
import { git, GIT_STATE } from "./git.js";

// A CHANGE'S NUMBER IS THE PROJECT'S, NOT THE CHECKOUT'S (change 0242).
//
// The next number was the highest one on disk plus one. Two people on two
// branches read the same disk, so both opened `0042-…`, and the merge that
// brought them together held two changes answering to one number — which is
// what a commit message, a task card and `doctrina close 0042` all name.
//
// The numbers already taken are therefore read from everywhere this clone
// can see them: the folders, the ledger (an abandoned change leaves only its
// line — third audit, change 0234), and the branches git knows about. A
// branch nobody fetched is still invisible, so the merge is checked too:
// `validate` names an open change that shares its number, and
// `doctrina change renumber` gives it the next free one.

const DATED = /^\d{4}-\d{2}-\d{2}-/;
const numberOf = (/** @type {string} */ id) => id.match(/^(\d{1,4})(?:-|$)/)?.[1]?.padStart(4, "0") ?? null;

/** How far back the other branches are read: a branch older than this was merged or forgotten. */
export const BRANCH_WINDOW_DAYS = 180;

/** Ids of the changes other branches added and this checkout does not hold. */
function idsOnOtherBranches(changesDir) {
  if (!isDir(changesDir)) return [];
  const log = git(changesDir, ["log", "--all", `--since=${BRANCH_WINDOW_DAYS}.days`, "--diff-filter=A",
    "--name-only", "--format=", "--", "."]);
  if (log.state !== GIT_STATE.OK) return [];
  const ids = new Set();
  for (const line of log.lines) {
    const m = line.match(/(?:^|\/)changes\/(?:archive\/\d{4}-\d{2}-\d{2}-)?(\d{1,4}-[^/]+)\/proposal\.md$/);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

/**
 * Every change id this clone knows of, by where it was found.
 * @returns {{ open: string[], archived: string[], ledger: string[], branches: string[] }}
 */
export function knownChangeIds(projectRoot, { branches = true } = {}) {
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  const archiveDir = path.join(changesDir, "archive");
  const folders = (/** @type {string} */ dir) => (isDir(dir)
    ? readdirSync(dir).filter((e) => !e.startsWith(".") && e !== "archive" && isDir(path.join(dir, e)))
    : []);
  const ledgerFile = path.join(archiveDir, "LEDGER.md");
  return {
    open: folders(changesDir),
    archived: folders(archiveDir).map((e) => e.replace(DATED, "")),
    ledger: isFile(ledgerFile) ? parseLedger(read(ledgerFile)).entries.map((e) => e.id) : [],
    branches: branches ? idsOnOtherBranches(changesDir) : [],
  };
}

/** The next free change number, four digits. */
export function nextChangeNumber(projectRoot) {
  const known = knownChangeIds(projectRoot);
  let max = 0;
  for (const id of [...known.open, ...known.archived, ...known.ledger, ...known.branches]) {
    const n = numberOf(id);
    if (n) max = Math.max(max, Number(n));
  }
  return String(max + 1).padStart(4, "0");
}

/**
 * Open changes whose number another change also carries. An archived pair is
 * history and stays as it is; an open one can still be given its own number.
 * @returns {{ id: string, shares: string }[]}
 */
export function sharedNumbers(projectRoot) {
  const known = knownChangeIds(projectRoot, { branches: false });
  const out = [];
  for (const id of known.open) {
    const n = numberOf(id);
    if (!n) continue;
    const other = [...known.open, ...known.archived, ...known.ledger].find((o) => o !== id && numberOf(o) === n);
    // Of two open changes that share a number, the one that sorts last moves:
    // one stable answer, whichever of the two a reader runs `validate` from.
    if (other && !(known.open.includes(other) && other > id)) out.push({ id, shares: other });
  }
  return out;
}

/**
 * Give an open change the next free number: the folder moves, and the id is
 * rewritten in the change's own files. The caller re-derives the index.
 * @returns {{ to: string, rewritten: string[] }}
 */
export function renumberChange(projectRoot, id) {
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  const to = `${nextChangeNumber(projectRoot)}-${id.replace(/^\d{1,4}-/, "")}`;
  const dir = path.join(changesDir, to);
  move(path.join(changesDir, id), dir);
  const rewritten = [];
  for (const file of walk(dir)) {
    if (!file.endsWith(".md")) continue;
    const text = read(file);
    if (!text.includes(id)) continue;
    write(file, text.replaceAll(id, to), { force: true });
    rewritten.push(path.relative(dir, file).split(path.sep).join("/"));
  }
  return { to, rewritten };
}

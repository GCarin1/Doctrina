// @ts-check
import path from "node:path";
import { mkdirSync, rmdirSync, statSync } from "node:fs";

// ONE AT A TIME, FOR THE FEW STEPS THAT MUST BE (seventh audit, change 0250).
//
// "One writer per repository" is the model; a planner and an executor in the
// same clone, or an agent that fires its tool calls in parallel, is what
// happens. Eight `doctrina work` at once opened three changes numbered 0003
// and two numbered 0004: each read the highest number on disk before any of
// the others had created its folder.
//
// The lock is a directory — `mkdir` either creates it or fails, atomically,
// on every filesystem this runs on. It is held for milliseconds. A lock left
// behind by a process that died is taken over once it is old.

// Held by this process, so a step that already holds the lock and calls one
// that takes it again — `work` opening a change, then indexing it — goes on
// instead of waiting five seconds for itself.
const HELD = new Set();

const WAIT_MS = 25;
const GIVE_UP_MS = 5000;
const STALE_MS = 30000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Run `fn` holding the project's lock. If the lock cannot be had in time the
 * function runs anyway: a stuck lock must never stop the work it protects.
 * @template T
 * @param {string} projectRoot
 * @param {() => T} fn
 * @returns {T}
 */
export function withProjectLock(projectRoot, fn) {
  const lock = path.join(projectRoot, ".doctrina", ".lock");
  if (HELD.has(lock)) return fn();
  let held = false;
  for (let waited = 0; waited <= GIVE_UP_MS; waited += WAIT_MS) {
    try {
      mkdirSync(lock);
      held = true;
      HELD.add(lock);
      break;
    } catch (err) {
      if (/** @type {NodeJS.ErrnoException} */ (err).code !== "EEXIST") break; // no .doctrina/, read-only tree: nothing to serialise
      try {
        if (Date.now() - statSync(lock).mtimeMs > STALE_MS) rmdirSync(lock);
      } catch { /* released between the two calls */ }
      sleep(WAIT_MS);
    }
  }
  try {
    return fn();
  } finally {
    if (held) {
      HELD.delete(lock);
      try {
        rmdirSync(lock);
      } catch { /* already gone */ }
    }
  }
}

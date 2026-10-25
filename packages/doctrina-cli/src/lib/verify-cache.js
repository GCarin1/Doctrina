// @ts-check
import path from "node:path";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { git, GIT_STATE, worktreeFingerprint } from "./git.js";
import { cliVersion } from "./version.js";

// A green verify, remembered for the exact code it ran on (change 0203).
//
// A field review of 0.17 put the fixed cost of a small change at the close
// running the whole suite — 2.5 to 4 minutes — and an agent typically runs
// `doctrina verify` itself right before `doctrina close`, so the same suite
// ran twice on the same code. In a batch close it ran once per id, on a tree
// whose only difference between ids was the artifacts the previous close
// archived.
//
// The fingerprint is the CODE: the working tree (tracked, untracked, edits,
// .gitignore respected) minus `.doctrina/`, plus the verify.json that
// defines the checks and the CLI version that runs them. `.doctrina/` is
// left out on purpose — the close's apply and archive move it between the
// verify a person ran and the one the close would run — and the artifact
// tree is proven by the close's own steps (coverage, trace, index drift,
// validate), which always run.
//
// The record lives in the git directory, never in the tree: it is a fact
// about this checkout, not an artifact to commit or review.

const RECORD = "doctrina-verify-green.json";

/**
 * @param {string} projectRoot
 * @param {string} configText  the verify.json the checks come from
 * @returns {string | null}    null when git cannot fingerprint the tree
 */
export function verifyFingerprint(projectRoot, configText) {
  const tree = worktreeFingerprint(projectRoot, { exclude: [".doctrina"] });
  if (tree === null) return null;
  return createHash("sha256").update(`${tree}\n${configText}\n${cliVersion()}`).digest("hex");
}

function recordPath(projectRoot) {
  const dir = git(projectRoot, ["rev-parse", "--absolute-git-dir"]);
  return dir.state === GIT_STATE.OK ? path.join(dir.stdout.trim(), RECORD) : null;
}

/**
 * Remember that every check passed on this fingerprint.
 * @param {string} projectRoot
 * @param {string} fingerprint
 * @param {string[]} checks
 */
export function recordGreen(projectRoot, fingerprint, checks) {
  const file = recordPath(projectRoot);
  if (!file) return;
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ fingerprint, checks, at: new Date().toISOString() }, null, 2) + "\n");
  } catch { /* a cache that cannot be written is a cache miss, never an error */ }
}

/**
 * The last green run, when it covered exactly this fingerprint.
 * @param {string} projectRoot
 * @param {string} fingerprint
 * @returns {{ fingerprint: string, checks: string[], at: string } | null}
 */
export function reusableGreen(projectRoot, fingerprint) {
  const file = recordPath(projectRoot);
  if (!file) return null;
  try {
    const rec = JSON.parse(readFileSync(file, "utf8"));
    return rec && rec.fingerprint === fingerprint ? rec : null;
  } catch {
    return null;
  }
}

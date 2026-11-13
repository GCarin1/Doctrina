// @ts-check
import path from "node:path";
import { createHash } from "node:crypto";
import { eolOf } from "./fs-ops.js";
import { extractOps } from "./spec-ops.js";

// THE RECORD OF WHICH DELTAS A CHANGE'S `applied` STAMP COVERS (change 0247).
//
// One line at the end of proposal.md, in a comment so no reader takes it for
// content:
//
//   <!-- doctrina:applied-deltas specs/auth/delta.md=3f1c9a7e,91bd02c4 -->
//
// One fingerprint per op of a delta's `ops` block, because the usual repair
// after a close that stopped is `doctrina change delta`, which adds ops to
// the delta that is already there. A delta without ops (ADDED, REMOVED) has
// one fingerprint, of its whole text. `none` when the change was applied
// with no delta at all — which is exactly the change one gets added to.

const RECORD = /<!-- doctrina:applied-deltas ([^>]*?) -->/;
const short = (/** @type {string} */ text) => createHash("sha256").update(text).digest("hex").slice(0, 8);

/** A delta's path inside its change, with forward slashes. */
export function deltaKey(changeDir, deltaPath) {
  return path.relative(changeDir, deltaPath).split(path.sep).join("/");
}

/**
 * What a delta holds: one fingerprint per op, or one of its whole text when
 * it carries no ops block. Line endings do not count.
 * @returns {string[]}
 */
export function deltaFingerprint(text) {
  const ops = extractOps(text);
  if (ops.length > 0) return ops.map((op) => short(JSON.stringify(op)));
  return [`text:${short(String(text).replace(/\r\n/g, "\n"))}`];
}

/**
 * The deltas the stamp covers, or null when the proposal carries no record
 * (a change applied by a CLI that did not write one).
 * @returns {Map<string, string[]> | null}
 */
export function appliedDeltas(proposal) {
  const m = String(proposal).match(RECORD);
  if (!m) return null;
  const out = new Map();
  for (const pair of m[1].trim().split(/\s+/)) {
    const at = pair.lastIndexOf("=");
    if (at > 0) out.set(pair.slice(0, at), pair.slice(at + 1).split(",").filter(Boolean));
  }
  return out;
}

/**
 * Which of a delta's ops the stamp does not cover yet. `gone` is true when an
 * op that WAS applied is no longer in the block as it was — changed or
 * removed — which nothing can apply on top of.
 * @param {string[]} recorded
 * @param {string[]} current
 * @returns {{ fresh: number[], gone: boolean }}
 */
export function pendingOps(recorded, current) {
  const left = new Map();
  for (const h of recorded) left.set(h, (left.get(h) ?? 0) + 1);
  const fresh = [];
  current.forEach((h, i) => {
    const n = left.get(h) ?? 0;
    if (n > 0) left.set(h, n - 1);
    else fresh.push(i);
  });
  return { fresh, gone: [...left.values()].some((n) => n > 0) };
}

/** The proposal with its record replaced, or appended as the last line. */
export function recordAppliedDeltas(proposal, entries) {
  const line = `<!-- doctrina:applied-deltas ${entries.length ? entries.map(([k, h]) => `${k}=${h.join(",")}`).join(" ") : "none"} -->`;
  const text = String(proposal);
  if (RECORD.test(text)) return text.replace(RECORD, line);
  const eol = eolOf(text);
  return text.replace(/\s*$/, "") + eol + eol + line + eol;
}

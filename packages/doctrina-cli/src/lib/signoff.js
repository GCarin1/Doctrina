// @ts-check
import path from "node:path";
import { isFile, read, write } from "./fs-ops.js";
import { today } from "./dates.js";
import { git, GIT_STATE, isRepo } from "./git.js";

// A manual sign-off has an EXPIRY (audit finding F12).
//
// `verify --signoff` recorded `{ date, note }`, that file was read by nothing
// but `verify` itself, and the signature held forever. So the one deliberate
// escape hatch from the build gate was also the one place a green gate could
// lie indefinitely: sign off "the error copy reads well", rewrite every
// message the next morning, and the gate still says yes.
//
// That is honest gates (ADR 0008) turned on the escape hatch itself. A
// signature is a statement about code at a moment; when that code moves, the
// statement is no longer evidence — it is history.
//
// The mechanism stays: a qualitative check is legitimate, and nothing here
// removes it. What changes is that the record now carries WHAT was signed
// (the covered paths, declared in verify.json like everything else — never
// inferred) and WHEN (the commit). `verify` compares the two against the
// working tree and reports one of four states.

export const SIGNOFF_REL = ".doctrina/verify.signoffs.json";

/**
 * The state of a manual check's evidence.
 *
 *   pending       never signed off.
 *   fresh         signed, and nothing it covers has moved since.
 *   expired       signed, but a covered path changed after the signature.
 *   unverifiable  signed in the pre-expiry format (no commit recorded), or
 *                 signed outside a repository — so "has it moved?" has no
 *                 answer. Not a pass: silence about whether evidence still
 *                 holds is not evidence that it does.
 *
 * Only `fresh` passes. The other three are warnings by default and failures
 * under --strict, which is exactly the rule `pending` already followed — a
 * manual check has always been non-blocking locally and required in CI, and
 * this keeps one rule rather than inventing a second.
 */
export function signoffState(projectRoot, check, record) {
  if (!record || !record.date) return { state: "pending" };
  const paths = declaredPaths(check);

  if (!record.sha) {
    return {
      state: "unverifiable",
      why: "signed before sign-offs recorded a commit, so what it covered cannot be checked",
      record,
    };
  }
  if (!isRepo(projectRoot)) {
    return { state: "unverifiable", why: "not a git repository, so a change since the signature cannot be detected", record };
  }
  if (paths.length === 0) {
    return {
      state: "unverifiable",
      why: `the check declares no "paths", so there is nothing to hold the signature to`,
      record,
    };
  }

  const changed = changedSince(projectRoot, record.sha, paths);
  if (changed === null) {
    return { state: "unverifiable", why: `commit ${short(record.sha)} is not in this repository's history`, record };
  }
  if (changed.length > 0) return { state: "expired", changed, record };
  return { state: "fresh", record };
}

/** The paths a check declares it covers. Declared, never inferred. */
export function declaredPaths(check) {
  const raw = check?.paths;
  if (Array.isArray(raw)) return raw.filter((p) => typeof p === "string" && p.trim() !== "");
  if (typeof raw === "string" && raw.trim() !== "") return [raw];
  return [];
}

/**
 * Which of `paths` changed between `sha` and the working tree.
 * Returns null when `sha` is not a commit this repository knows — an
 * unanswerable question, reported as such rather than as "nothing changed".
 */
export function changedSince(projectRoot, sha, paths) {
  const known = git(projectRoot, ["cat-file", "-e", `${sha}^{commit}`]);
  if (known.state !== GIT_STATE.OK) return null;
  // Committed changes and the working tree both count: a signature is about
  // the code as it stands, not as it was last committed.
  const committed = git(projectRoot, ["diff", "--name-only", sha, "--", ...paths]);
  const working = git(projectRoot, ["diff", "--name-only", "HEAD", "--", ...paths]);
  if (committed.state !== GIT_STATE.OK) return null;
  const out = new Set(committed.lines.filter(Boolean));
  if (working.state === GIT_STATE.OK) for (const f of working.lines.filter(Boolean)) out.add(f);
  return [...out].sort();
}

/** The commit a signature is anchored to, or null outside a repository. */
export function currentSha(projectRoot) {
  const r = git(projectRoot, ["rev-parse", "HEAD"]);
  return r.state === GIT_STATE.OK ? r.stdout.trim() : null;
}

export function short(sha) {
  return String(sha ?? "").slice(0, 8);
}

export function loadSignoffs(projectRoot) {
  const p = path.join(projectRoot, SIGNOFF_REL);
  if (!isFile(p)) return {};
  try {
    return JSON.parse(read(p)) ?? {};
  } catch {
    return {};
  }
}

export function saveSignoffs(projectRoot, signoffs) {
  write(path.join(projectRoot, SIGNOFF_REL), JSON.stringify(signoffs, null, 2) + "\n", { force: true });
}

/** Record a signature against today's date, the current commit, and what it covers. */
export function recordSignoff(projectRoot, check, note) {
  const entry = { date: today(), note };
  const sha = currentSha(projectRoot);
  if (sha) entry.sha = sha;
  const paths = declaredPaths(check);
  if (paths.length > 0) entry.paths = paths;
  return entry;
}

/**
 * How many of a project's manual checks are signed and still fresh — the
 * number that lets a report say "executed proof" and "signed proof" apart
 * instead of counting both as green.
 */
export function summarizeSignoffs(projectRoot, checks) {
  const signoffs = loadSignoffs(projectRoot);
  const counts = { manual: 0, fresh: 0, expired: 0, unverifiable: 0, pending: 0 };
  for (const ch of checks) {
    if (ch?.type !== "manual") continue;
    counts.manual += 1;
    counts[signoffState(projectRoot, ch, signoffs[ch.name ?? "check"]).state] += 1;
  }
  return counts;
}

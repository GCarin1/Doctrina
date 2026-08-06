import { spawnSync } from "node:child_process";

// One place that knows how to ask git a question and how to interpret not
// getting an answer (audit item C8).
//
// Nine call sites each ran `spawnSync("git", ...)` and decided for
// themselves what a non-zero status meant. `metrics` decided it meant
// failure, so on a brand-new project — the most common state in which
// someone explores the CLI — it printed:
//
//   error: git log failed: fatal: your current branch 'master' does not
//   have any commits yet
//
// A repository with no commits is a valid state, not an error. So is a
// directory that is not a repository at all. What is genuinely an error
// is git being absent when a command cannot work without it — and that is
// an ENVIRONMENT condition (exit 4), not a gate failure.

export const GIT_STATE = Object.freeze({
  /** git ran and answered. */
  OK: "ok",
  /** A repository with no commits yet — a valid first-run state. */
  EMPTY: "empty",
  /** Not a git repository. */
  NOT_A_REPO: "not-a-repo",
  /** git is not installed or not on PATH. */
  ABSENT: "absent",
  /** git ran and refused, for a reason this module does not classify. */
  FAILED: "failed",
});

// Run a git command. Never throws. Returns
// { state, stdout, lines, stderr, code }.
export function git(cwd, args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.error) {
    // ENOENT here means the binary is missing, not that the command failed.
    return { state: GIT_STATE.ABSENT, stdout: "", lines: [], stderr: String(r.error.message ?? ""), code: null };
  }
  const stderr = String(r.stderr ?? "");
  if (r.status === 0) {
    const stdout = String(r.stdout ?? "");
    return { state: GIT_STATE.OK, stdout, lines: splitLines(stdout), stderr, code: 0 };
  }
  // git's own wording for the benign cases. Matched on the message because
  // git reports them all with a generic non-zero status. "Needed a single
  // revision" is what `rev-parse --verify HEAD` says on a repo with no
  // commits, which is how the empty-history probe first fooled itself.
  if (/does not have any commits yet|unknown revision or path not in the working tree|bad default revision|Needed a single revision|ambiguous argument 'HEAD'/i.test(stderr)) {
    return { state: GIT_STATE.EMPTY, stdout: "", lines: [], stderr, code: r.status };
  }
  if (/not a git repository/i.test(stderr)) {
    return { state: GIT_STATE.NOT_A_REPO, stdout: "", lines: [], stderr, code: r.status };
  }
  // Anything else that exited non-zero is a failure, NOT a success with an
  // empty answer. Reporting it as OK is how a caller reads "no results"
  // from a command that actually refused.
  return { state: GIT_STATE.FAILED, stdout: "", lines: [], stderr, code: r.status };
}

// Is this a git repository at all?
export function isRepo(cwd) {
  return git(cwd, ["rev-parse", "--is-inside-work-tree"]).state === GIT_STATE.OK;
}

// Does it have at least one commit? False for a fresh `git init`.
export function hasCommits(cwd) {
  return git(cwd, ["rev-parse", "--verify", "HEAD"]).state === GIT_STATE.OK;
}

// The state a command should report before trying to read history:
// { usable, state, reason } where `reason` is a sentence fit to print.
export function historyState(cwd) {
  const probe = git(cwd, ["rev-parse", "--is-inside-work-tree"]);
  if (probe.state === GIT_STATE.ABSENT) {
    return { usable: false, state: GIT_STATE.ABSENT, reason: "git is not installed or not on PATH" };
  }
  if (probe.state !== GIT_STATE.OK) {
    return { usable: false, state: GIT_STATE.NOT_A_REPO, reason: "this is not a git repository" };
  }
  if (!hasCommits(cwd)) {
    return { usable: false, state: GIT_STATE.EMPTY, reason: "this repository has no commits yet" };
  }
  return { usable: true, state: GIT_STATE.OK, reason: "" };
}

// Lines of output, trimmed and blank-filtered — what nearly every caller
// actually wanted from stdout.
export function gitLines(cwd, args) {
  const r = git(cwd, args);
  return r.state === GIT_STATE.OK ? r.lines : [];
}

function splitLines(s) {
  return s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

// @ts-check
// The exit-code contract (audit item C7).
//
// Code 1 used to mean three different things, and an agent driving the
// loop could not tell them apart:
//
//   "your change is not ready"       -> iterate and retry
//   "this project is not configured" -> run a setup command first
//   "this machine cannot run this"   -> stop
//
// All three returned 1. The first means keep working, the second means do
// something else first, the third means give up — and an autonomous loop
// that cannot distinguish them either spins on an unfixable failure or
// abandons a fixable one.
//
// This is the smallest module in the CLI and the one a machine consumer
// depends on most. Every command's exit path maps to a member here.

export const EXIT = Object.freeze({
  /** The command did what it was asked. Warnings are allowed. */
  OK: 0,
  /** A gate failed: the WORK is not ready. Fix the work and retry. */
  GATE: 1,
  /** The INVOCATION is wrong: unknown command, missing/malformed argument.
   *  Do not retry unchanged. */
  USAGE: 2,
  /** A PRECONDITION is missing: the project is not set up for this yet.
   *  Run the named setup command, then retry. */
  PRECONDITION: 3,
  /** The ENVIRONMENT cannot run this: git absent, unreadable tree, and
   *  other conditions no amount of retrying fixes. Stop. */
  ENVIRONMENT: 4,
});

// What each code means, for `--help`, the docs, and the tests that assert
// the mapping. Keyed by numeric code so a consumer can look one up.
export const EXIT_MEANINGS = Object.freeze({
  [EXIT.OK]: {
    name: "OK",
    summary: "success (warnings allowed)",
    agentAction: "continue",
  },
  [EXIT.GATE]: {
    name: "GATE",
    summary: "a gate failed — the work is not ready",
    agentAction: "fix the work, then retry the same command",
  },
  [EXIT.USAGE]: {
    name: "USAGE",
    summary: "the invocation is wrong — unknown command or bad argument",
    agentAction: "do not retry unchanged; correct the invocation",
  },
  [EXIT.PRECONDITION]: {
    name: "PRECONDITION",
    summary: "a precondition is missing — the project is not set up for this",
    agentAction: "run the setup command named in the error, then retry",
  },
  [EXIT.ENVIRONMENT]: {
    name: "ENVIRONMENT",
    summary: "the environment cannot run this command",
    agentAction: "stop; retrying will not help",
  },
});

// The block `doctrina --help` prints, generated so help and contract
// cannot drift.
export function exitCodeHelp() {
  return Object.entries(EXIT_MEANINGS)
    .map(([code, m]) => `  ${code}  ${m.summary}`)
    .join("\n");
}

// A precondition failure, thrown by a command whose project/config is not
// ready. The entrypoint maps it to EXIT.PRECONDITION and prints the setup
// command, so every "you need to run X first" path reports the same code.
export class PreconditionError extends Error {
  constructor(message, remedy) {
    super(message);
    this.name = "PreconditionError";
    this.exitCode = EXIT.PRECONDITION;
    this.remedy = remedy ?? null;
  }
}

// An environment failure: the machine, not the project, is the problem.
export class EnvironmentError extends Error {
  constructor(message, remedy) {
    super(message);
    this.name = "EnvironmentError";
    this.exitCode = EXIT.ENVIRONMENT;
    this.remedy = remedy ?? null;
  }
}

// "Not a Doctrina project" is the single most common precondition, raised
// by nearly every command. One constructor so the message and the code
// stay identical everywhere.
export function notADoctrinaProject() {
  return new PreconditionError(
    "not a Doctrina project (no .doctrina/ in cwd)",
    "doctrina init",
  );
}

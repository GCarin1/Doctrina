// @ts-check
import process from "node:process";
import { EXIT } from "./exit-codes.js";

// `--json` on every command, with a versioned envelope (audit item M7).
//
// Five of thirty-five commands spoke JSON. Everything else emitted
// ANSI-coloured prose, while the primary consumer is a machine. Paired with
// the exit-code contract (ADR 0018), the two form the machine interface:
// structured output plus a meaningful status. Without both, an autonomous
// loop is parsing English.
//
// Two levels of support, and the difference is stated rather than hidden:
//
//   STRUCTURED — the command builds a payload describing its result. These
//     are the read and report commands, where a result has real shape.
//   ENVELOPE   — the command's human output is captured and returned inside
//     a versioned envelope alongside `ok` and `exitCode`. Branch on those;
//     the lines are there for completeness, not for parsing.
//
// A command with nothing better to say is still machine-consumable, which
// is what makes "--json on every command" a claim rather than an intention.

export const JSON_SCHEMA_VERSION = "1.0.0";

export function wantsJson(flags) {
  return flags?.get?.("json") === true;
}

// A deprecation notice belongs in the ENVELOPE, not only on the terminal
// (change 0061). Change 0049 announced a superseded name on the real stderr,
// before capture — right for a piped stdout, which stays exactly what it
// was, but it meant the envelope's `stderr` array came back empty and the
// machine reading only that never learned the name it invoked is on its way
// out. Deprecation exists so consumers migrate, and this CLI's primary
// consumer is an agent reading JSON.
//
// Set once by the entrypoint, before the command runs, so BOTH json paths
// carry it: the captured envelope and a command that builds its own payload.
/** @type {{ use: string, since: string, why: string } | null} */
let deprecation = null;

/** @param {{ use: string, since: string, why: string } | null} record */
export function setDeprecation(record) {
  deprecation = record;
}

// A command that builds its own payload calls `emitJson` BEFORE it returns —
// in `coverage.js` the call sits one line above `return jsonClean ? 0 :
// strict ? 1 : 0`. So the call site cannot know the exit code, and the
// optimistic defaults answered for it: `coverage --strict` exited 1 while
// its payload said `"ok": true, "exit_code": 0`, and `exit_code` was 0 in
// every native payload the CLI has ever emitted (change 0086).
//
// The entrypoint is the one place that knows the code, which is why the
// CAPTURED path (a command with no payload of its own) was always right: it
// emits after the run, with the real code. The native path now works the
// same way — `deferJson()` before the run holds the payload, `flushJson(code)`
// after it writes the envelope with the verdict the process actually reports.
/** @type {{ command: string, data: object, opts: object } | null} */
let held = null;
let deferring = false;

/** Hold the next payload instead of writing it, until `flushJson`. */
export function deferJson() {
  deferring = true;
  held = null;
}

/**
 * Write the held payload with the exit code the command actually returned,
 * and leave deferred mode. A no-op when the command emitted nothing.
 */
export function flushJson(code) {
  deferring = false;
  if (!held) return;
  const { command, data } = held;
  held = null;
  writeEnvelope(command, data, { ok: code === EXIT.OK, exitCode: code });
}

// Print a structured payload. `command` is the invocation, `data` whatever
// that command has to say.
export function emitJson(command, data, opts = {}) {
  if (deferring) {
    held = { command, data, opts };
    return;
  }
  writeEnvelope(command, data, opts);
}

function writeEnvelope(command, data, { ok = true, exitCode = EXIT.OK } = {}) {
  process.stdout.write(JSON.stringify({
    $schema_version: JSON_SCHEMA_VERSION,
    command,
    ok,
    exit_code: exitCode,
    // Present only when the invoked name is superseded, so a consumer can
    // branch on its presence rather than on a string.
    ...(deprecation ? { deprecated: deprecation } : {}),
    ...data,
  }, null, 2) + "\n");
}

// Run `fn` with console output captured, so a command that has no
// structured payload can still answer in JSON. Returns { code, stdout,
// stderr } with the lines it would have printed.
export async function captureOutput(fn) {
  const stdout = [];
  const stderr = [];
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  // Some commands write to the stream directly rather than through console
  // — `completion` emits a shell script meant for redirection. Capturing
  // only console.* let that output escape the envelope and corrupt the
  // JSON on stdout, so the raw stream is captured too.
  const origWrite = process.stdout.write.bind(process.stdout);
  // The raw stderr stream is captured too (change 0114): `verify` tees a
  // child's stderr straight to process.stderr, so a failing check's
  // diagnostics landed on the real stderr while the envelope said
  // `"stderr": []`. Carriage returns are stripped — a child on Windows
  // writes CRLF, and `"ok\r"` is not a line.
  const origErrWrite = process.stderr.write.bind(process.stderr);
  const pushLines = (target, chunk) => {
    for (const line of String(chunk).replace(/\r?\n$/, "").split(/\r?\n/)) target.push(line.replace(/\r$/, ""));
  };
  console.log = (...args) => stdout.push(args.map(String).join(" "));
  console.error = (...args) => stderr.push(args.map(String).join(" "));
  console.warn = (...args) => stderr.push(args.map(String).join(" "));
  process.stdout.write = (chunk, ...rest) => {
    pushLines(stdout, chunk);
    const cb = rest.find((r) => typeof r === "function");
    if (cb) cb();
    return true;
  };
  process.stderr.write = (chunk, ...rest) => {
    pushLines(stderr, chunk);
    const cb = rest.find((r) => typeof r === "function");
    if (cb) cb();
    return true;
  };
  try {
    const code = await fn();
    return { code: code ?? EXIT.OK, stdout, stderr };
  } finally {
    console.log = origLog;
    console.error = origError;
    console.warn = origWarn;
    process.stdout.write = origWrite;
    process.stderr.write = origErrWrite;
  }
}

// Strip ANSI so captured lines are usable as data even when colour was on.
export function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\[[0-9;]*m/g, "");
}

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

// Print a structured payload. `command` is the invocation, `data` whatever
// that command has to say.
export function emitJson(command, data, { ok = true, exitCode = EXIT.OK } = {}) {
  process.stdout.write(JSON.stringify({
    $schema_version: JSON_SCHEMA_VERSION,
    command,
    ok,
    exit_code: exitCode,
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
  const pushLines = (target, chunk) => {
    for (const line of String(chunk).replace(/\n$/, "").split("\n")) target.push(line);
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
  try {
    const code = await fn();
    return { code: code ?? EXIT.OK, stdout, stderr };
  } finally {
    console.log = origLog;
    console.error = origError;
    console.warn = origWarn;
    process.stdout.write = origWrite;
  }
}

// Strip ANSI so captured lines are usable as data even when colour was on.
export function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\[[0-9;]*m/g, "");
}

// @ts-check
import process from "node:process";

// THE COMMANDS THE CLI PRINTS ARE RUN AS PRINTED (fourth audit, change 0235).
//
// `next`, `delivery status`, the playbooks and the hub hand an agent a line
// to paste into its shell: `cd <repo> && doctrina work "<title>" --delivery
// <id>`. The title comes from the tracker — text the delivery playbook calls
// data, never an instruction — and it was interpolated between double quotes
// as it came: a story titled `Fix $(curl … | sh)` became a command the agent
// ran, and a repository under `~/my api/` became a `cd` into `~/my`.

// Inside double quotes a POSIX shell still expands these. PowerShell expands
// only `$` and the backtick, and to it (and to cmd) a backslash is a literal:
// every Windows path has one, so counting it single-quoted every path there.
const DOUBLE_QUOTE_UNSAFE = /["`$\\!]/;
const DOUBLE_QUOTE_UNSAFE_WIN32 = /["`$]/;
const BARE_PATH = /^[A-Za-z0-9_./:\\~+@%=,-]+$/;

/**
 * One shell argument, quoted so the shell reads it back verbatim. Plain text
 * keeps the double quotes every surface has always printed; text a double
 * quote would still expand is single-quoted — POSIX `'\''` for an embedded
 * quote, PowerShell's `''` on Windows.
 * @param {string} value
 * @param {NodeJS.Platform} [platform]
 */
export function qarg(value, platform = process.platform) {
  const s = String(value ?? "");
  const unsafe = platform === "win32" ? DOUBLE_QUOTE_UNSAFE_WIN32 : DOUBLE_QUOTE_UNSAFE;
  if (!unsafe.test(s)) return `"${s}"`;
  const inner = platform === "win32" ? s.replace(/'/g, "''") : s.replace(/'/g, "'\\''");
  return `'${inner}'`;
}

/**
 * A path as a shell argument: bare when nothing in it needs quoting.
 * @param {string} dir
 * @param {NodeJS.Platform} [platform]
 */
export function qpath(dir, platform = process.platform) {
  const s = String(dir ?? "");
  return BARE_PATH.test(s) ? s : qarg(s, platform);
}

/** `cd <dir> && <command>`, with the directory quoted when it must be. */
export function cdThen(dir, command) {
  return `cd ${qpath(dir)} && ${command}`;
}

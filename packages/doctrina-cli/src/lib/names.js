// @ts-check
// One grammar for the NAME of a spec, a contract or a skill (change 0110).
//
// Three commands carried their own copy of `/^[a-z][a-z0-9-]*$/`, and none
// of them knew anything about a file system. Measured on Windows: `spec new
// nul` created `.doctrina/specs/nul/spec.md` — a directory Node could write
// and git could neither see nor remove (`could not open directory`, `failed
// to remove`), gone only through a `\\?\` path. `con`, `prn`, `aux`,
// `com1`-`com9` and `lpt1`-`lpt9` are device names on Windows, and this
// repository's own tree is Windows/CRLF. A 120-character name passed too
// (`Filename too long` from git), as did `trail-` and `a--b`.
//
// A name is a directory name on every file system the project will touch.
// The message names the rule that failed, so the fix is the invocation.

const RESERVED = new Set([
  "con", "prn", "aux", "nul",
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

const NAME_MAX = 64;

/**
 * null when `name` is a legal artifact name; otherwise the reason, ready to
 * print after "error:".
 *
 * @param {string | undefined} name
 * @param {string} kind  "capability" | "contract name" | "skill name"
 * @returns {string | null}
 */
export function artifactNameError(name, kind) {
  const value = String(name ?? "");
  if (value === "") return `${kind} is required`;
  if (!/^[a-z0-9-]+$/.test(value)) return `${kind} must be lowercase letters, digits, or hyphens (got "${value}")`;
  if (!/^[a-z]/.test(value)) return `${kind} must start with a letter (got "${value}")`;
  if (/-$/.test(value)) return `${kind} must not end with a hyphen (got "${value}")`;
  if (/--/.test(value)) return `${kind} must not contain a doubled hyphen (got "${value}")`;
  if (value.length > NAME_MAX) return `${kind} must be at most ${NAME_MAX} characters (got ${value.length})`;
  if (RESERVED.has(value)) return `${kind} "${value}" is a reserved device name on Windows — a directory git cannot see or remove there; pick another`;
  return null;
}

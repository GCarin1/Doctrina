// @ts-check
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMAND_NAMES } from "./commands.js";

// One catalog of "which flags does command X accept", with two consumers:
//
//   - the static undeclared-flag test (C3), which asserts every flag a
//     command READS is declared, so `parseArgs` never swallows a positional
//     as an undeclared flag's value again; and
//   - the docs accuracy gate (D1, `scripts/check-docs.js`), which asserts
//     every flag the DOCS document against a command is declared.
//
// One invariant, two checks: source and prose are held to the same list, so
// a renamed flag cannot stay green in either place. Both read a command
// module's exported `flags` — the declaration lives WITH the command, not in
// the entrypoint, which is why an added command no longer requires editing
// `src/index.js` to make its flags parse (the structural half of C3).

const here = path.dirname(fileURLToPath(import.meta.url));
const commandsDir = path.join(here, "..", "commands");

// Flags the entrypoint owns for every command; a command never redeclares them.
export const GLOBAL_FLAGS = Object.freeze({
  boolean: ["help", "h", "v", "debug"],
  string: [],
});

// Command name -> module filename. Every command's module is `<name>.js`
// except where this map says otherwise.
const MODULE_OVERRIDES = { index: "index-rebuild.js" };

export function moduleFileFor(commandName) {
  return MODULE_OVERRIDES[commandName] ?? `${commandName}.js`;
}

export function modulePathFor(commandName) {
  return path.join(commandsDir, moduleFileFor(commandName));
}

// The flag spec a command module exports, normalised to
// { boolean: string[], string: string[] }. Returns null when the module
// declares none — which the C3 test treats as a failure and the docs gate
// treats as "not checkable yet", so the two can land independently.
export async function loadFlagSpec(commandName) {
  const mod = await import(pathToUrl(modulePathFor(commandName)));
  const spec = mod.flags;
  if (!spec) return null;
  return {
    boolean: [...(spec.boolean ?? [])],
    string: [...(spec.string ?? [])],
  };
}

// Every flag name a command accepts (own + global), as a Set. null when the
// command declares no spec.
export async function declaredFlags(commandName) {
  const spec = await loadFlagSpec(commandName);
  if (!spec) return null;
  return new Set([
    ...spec.boolean, ...spec.string,
    ...GLOBAL_FLAGS.boolean, ...GLOBAL_FLAGS.string,
  ]);
}

export async function loadAllFlagSpecs() {
  const out = new Map();
  for (const name of COMMAND_NAMES) out.set(name, await loadFlagSpec(name));
  return out;
}

// Flag names a source file READS, by scanning its call sites:
//   flagBool(flags, "x")  flagString(flags, "x")  flags.has("x")  flags.get("x")
// Deterministic text scan, not execution — it sees every branch, including
// the ones a given run never takes.
export function scanFlagUsage(sourceText) {
  const used = new Set();
  const patterns = [
    /flagBool\(\s*flags\s*,\s*["']([^"']+)["']/g,
    /flagString\(\s*flags\s*,\s*["']([^"']+)["']/g,
    /flags\.has\(\s*["']([^"']+)["']/g,
    /flags\.get\(\s*["']([^"']+)["']/g,
  ];
  for (const re of patterns) {
    for (const m of sourceText.matchAll(re)) used.add(m[1]);
  }
  return used;
}

export function readCommandSource(commandName) {
  return readFileSync(modulePathFor(commandName), "utf8");
}

// Flags a command's `help` string documents: every `--flag` token in it.
// The docs gate compares prose against this too, so help and reference
// cannot drift apart from the declaration.
export function scanHelpFlags(helpText) {
  const out = new Set();
  for (const m of String(helpText ?? "").matchAll(/--([a-z][a-z0-9-]*)/g)) out.add(m[1]);
  return out;
}

function pathToUrl(p) {
  return "file:///" + p.replace(/\\/g, "/");
}

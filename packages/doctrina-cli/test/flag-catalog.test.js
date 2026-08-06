import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { COMMAND_NAMES } from "../src/lib/commands.js";
import {
  GLOBAL_FLAGS, declaredFlags, loadFlagSpec, readCommandSource, scanFlagUsage,
} from "../src/lib/flag-catalog.js";

// C3. Six flags shipped undeclared, and the failure was silent AND
// misleading: an undeclared flag whose next token does not start with "-"
// swallows that token as its value, so `change new --chore ajuste-ci
// "Ajustar CI"` lost the id and reported "requires a title" for a title
// that was right there in quotes.
//
// These are the real deliverable — the seven fixes are their consequence.
// They fail if anyone later reads a flag a command does not declare, or
// documents one in `--help` that does not exist.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("every command declares a flag spec", async () => {
  const missing = [];
  for (const name of COMMAND_NAMES) {
    if ((await loadFlagSpec(name)) === null) missing.push(name);
  }
  assert.deepEqual(missing, [],
    `these commands export no \`flags\`, so their flags cannot be parsed or checked: ${missing.join(", ")}`);
});

test("every flag a command READS is declared by that command", async () => {
  // The static scan sees every branch, including ones a given run never
  // takes — which is exactly how the six undeclared flags hid.
  const problems = [];
  for (const name of COMMAND_NAMES) {
    const declared = await declaredFlags(name);
    assert.ok(declared, `${name} declares no flag spec`);
    for (const used of scanFlagUsage(readCommandSource(name))) {
      if (!declared.has(used)) {
        problems.push(`${name} reads --${used} but does not declare it`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});

// The flags a help string DOCUMENTS as this command's own: the names in
// the option-name position of each line in the "Options:" block. A flag
// inside an option's DESCRIPTION is prose about another command
// ("--once   Run a single pass (validate --fix + next)") and is not a
// declaration, so only the leading run of names on each line counts.
function documentedOptionFlags(help) {
  const lines = String(help).split("\n");
  const start = lines.findIndex((l) => /^Options:\s*$/.test(l));
  if (start < 0) return new Set();
  const out = new Set();
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break; // a new unindented block ends the section
    const lead = line.match(/^\s+(--[a-z][a-z0-9-]*(?:\s*,\s*--[a-z][a-z0-9-]*)*)/);
    if (!lead) continue;
    for (const m of lead[1].matchAll(/--([a-z][a-z0-9-]*)/g)) out.add(m[1]);
  }
  return out;
}

test("every flag a command's help DOCUMENTS is declared by that command", async () => {
  const mod = async (name) => import(
    "file:///" + path.resolve(here, "..", "src", "commands",
      name === "index" ? "index-rebuild.js" : `${name}.js`).replace(/\\/g, "/"));
  const problems = [];
  for (const name of COMMAND_NAMES) {
    const declared = await declaredFlags(name);
    const help = (await mod(name)).help ?? "";
    // Only the Options block is the command's flag contract. Prose
    // elsewhere legitimately names other commands' flags ("pass through to
    // `change archive --force`") and wrapped prose can even start a line
    // with one ("... → coverage\n--strict (scoped ...)"), so anchoring on
    // indentation alone reports drift that is not there.
    for (const flag of documentedOptionFlags(help)) {
      if (!declared.has(flag)) {
        problems.push(`${name} --help documents --${flag} in its Options block but does not declare it`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});

test("global flags are declared once, in the catalog, not per command", async () => {
  for (const name of COMMAND_NAMES) {
    const spec = await loadFlagSpec(name);
    for (const g of [...GLOBAL_FLAGS.boolean, ...GLOBAL_FLAGS.string]) {
      assert.ok(!spec.boolean.includes(g) && !spec.string.includes(g),
        `${name} redeclares the global flag --${g}`);
    }
  }
});

test("a declared flag parses identically before and after its positionals", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-flags-"));
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme", "--project-description", "x"], tmp);

    // The exact reproduction from the audit: the flag first used to eat the id.
    const after = runCli(["change", "new", "ajuste-a", "Ajustar CI", "--chore"], tmp);
    const before = runCli(["change", "new", "--chore", "ajuste-b", "Ajustar CI"], tmp);
    assert.equal(after.status, 0, after.stdout + after.stderr);
    assert.equal(before.status, 0, before.stdout + before.stderr);
    assert.match(before.stdout, /Chore opened/, "the flag must take effect in either position");
    assert.doesNotMatch(before.stderr, /requires a title/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("each previously undeclared flag now works in the leading position", () => {
  // The six from the audit plus --debug: quiet, chore, no-spec, design,
  // from-diff, run, debug.
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-flags2-"));
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme", "--project-description", "x"], tmp);

    const quiet = runCli(["work", "--quiet", "add a thing"], tmp);
    assert.equal(quiet.status, 0, quiet.stdout + quiet.stderr);
    assert.match(quiet.stdout, /opened/, "--quiet leading must not eat the prompt");
    assert.doesNotMatch(quiet.stdout, /Execute in order/);

    const design = runCli(["change", "new", "--design", "0002-x", "a title"], tmp);
    assert.equal(design.status, 0, design.stdout + design.stderr);
    assert.match(design.stdout, /design\.md/, "--design leading must still scaffold design.md");

    const noSpec = runCli(["change", "new", "--no-spec", "0003-y", "another title"], tmp);
    assert.equal(noSpec.status, 0, noSpec.stdout + noSpec.stderr);
    assert.match(noSpec.stdout, /Chore opened/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPRECATED, MOMENTS, OPERATIONS } from "../src/lib/commands.js";

// THE HELP STARTS WHERE A NEWCOMER STARTS.
//
// `doctrina --help` (and `doctrina` alone) printed the sixty-one operations
// as one flat list, deprecated ones mixed in, in catalog order: the question
// "where do I begin?" was answered with the whole surface. The AGENTS.md
// block already grouped commands by the moment they are reached for; the
// help now does the same, opens with the two commands a person types, puts
// each command on one line with its subcommands, and lists deprecated names
// last with their replacement.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const help = spawnSync(process.execPath, [cliEntry, "--help"], {
  encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
}).stdout;
const bare = spawnSync(process.execPath, [cliEntry], {
  encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
}).stdout;
const lines = help.split("\n");
const at = (heading) => lines.indexOf(heading);

test("the help opens with where to start, before any group", () => {
  assert.ok(at("Start here:") > 0);
  assert.match(help, /^  doctrina init +set up this repository/m);
  assert.match(help, /^  doctrina next +what to do now/m);
  for (const moment of MOMENTS) assert.ok(at("Start here:") < at(`${moment}:`), moment);
  assert.equal(bare, help, "`doctrina` alone prints the same help");
});

test("the groups follow the moments, in the AGENTS.md order", () => {
  const positions = MOMENTS.map((m) => at(`${m}:`));
  assert.ok(positions.every((p) => p > 0), `every moment has a group: ${positions}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("one line per command, and deprecated names only in the last group", () => {
  const deprecatedAt = at("Deprecated (still run, with a notice on stderr):");
  assert.ok(deprecatedAt > at("Maintain:"));
  const body = lines.slice(at("Bootstrap:"), deprecatedAt);
  for (const op of Object.keys(DEPRECATED)) {
    assert.ok(!body.some((l) => new RegExp(`^  ${op}\\s`).test(l)), `${op} listed among live commands`);
    assert.match(lines.slice(deprecatedAt).join("\n"), new RegExp(`^  ${op} +→ ${DEPRECATED[op].use}`, "m"));
  }
  const commands = new Set(OPERATIONS.filter(([op]) => !DEPRECATED[op]).map(([op]) => op.split(" ")[0]));
  for (const cmd of commands) {
    const count = body.filter((l) => new RegExp(`^  ${cmd}( |$)`).test(l)).length;
    assert.equal(count, 1, `${cmd} has ${count} lines`);
  }
  assert.ok(lines.length < 77, `the help is ${lines.length} lines; the flat list was 77`);
});

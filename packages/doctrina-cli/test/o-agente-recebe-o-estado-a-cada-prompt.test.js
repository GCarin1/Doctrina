// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mergeJson, unmergeJson } from "../src/lib/adapters.js";

// THE AGENT IS TOLD THE PROJECT'S STATE AT EVERY PROMPT (change 0211).
//
// A field review of an agent running Doctrina in Cursor: "without the
// framework's name in the request, the request for code wins". The cycle was
// written in AGENTS.md, read once, competing with the request read now. The
// adapters now install the agent's own hooks: the primer at session start
// and one factual line beside every prompt (Claude). The hooks live in the
// agent's settings, which the project may already own, so they are MERGED.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-hooks-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return { dir, run };
}

test("prime --pulse is one factual line naming the open change, or how to open one", () => {
  const { dir, run } = project();
  try {
    const none = run(["prime", "--pulse"]).stdout.trim().split("\n");
    assert.equal(none.length, 1);
    assert.match(none[0], /no change is open .* `doctrina work "<request>"`/);
    assert.equal(run(["change", "new", "0001-login", "Add login"]).status, 0);
    const one = run(["prime", "--pulse"]).stdout;
    assert.match(one, /open change: 0001-login — "Add login" \(proposed\)\. .*first sentence to the human .*`doctrina close <id>`/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prime --hook speaks each agent's format and refuses an unknown one", () => {
  const { dir, run } = project();
  try {
    const claude = run(["prime", "--hook", "claude"]);
    assert.equal(claude.status, 0);
    assert.match(claude.stdout, /^Doctrina session primer/);
    assert.doesNotMatch(claude.stdout, /\x1b\[/, "no colour codes reach the agent");
    const cursor = JSON.parse(run(["prime", "--hook", "cursor"]).stdout);
    assert.match(cursor.additional_context, /Doctrina prime/);
    assert.ok(cursor.additional_context.length <= 9000);
    assert.equal(run(["prime", "--hook", "vim"]).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("adapter add merges the hooks into the user's settings, and remove takes back only its own", () => {
  const { dir, run } = project();
  try {
    const settings = path.join(dir, ".claude", "settings.json");
    mkdirSync(path.dirname(settings), { recursive: true });
    const mine = { permissions: { allow: ["Bash(ls)"] }, hooks: { Stop: [{ hooks: [{ type: "command", command: "echo hi" }] }] } };
    writeFileSync(settings, JSON.stringify(mine));

    assert.match(run(["adapter", "add", "claude"]).stdout, /merged\s+\.claude\/settings\.json/);
    const merged = JSON.parse(readFileSync(settings, "utf8"));
    assert.deepEqual(merged.permissions, mine.permissions);
    assert.deepEqual(Object.keys(merged.hooks).sort(), ["SessionStart", "Stop", "UserPromptSubmit"]);
    assert.match(JSON.stringify(merged.hooks.UserPromptSubmit), /doctrina prime --pulse/);
    assert.match(run(["adapter", "add", "claude"]).stdout, /already holds the doctrina entries/, "added once");

    run(["adapter", "remove", "claude"]);
    assert.deepEqual(JSON.parse(readFileSync(settings, "utf8")), mine, "the user's file is back as it was");

    // Cursor's own file is created, and goes with the adapter.
    run(["adapter", "add", "cursor"]);
    const hooks = JSON.parse(readFileSync(path.join(dir, ".cursor", "hooks.json"), "utf8"));
    assert.match(JSON.stringify(hooks.hooks.sessionStart), /doctrina prime --hook cursor/);
    run(["adapter", "remove", "cursor"]);
    assert.ok(!existsSync(path.join(dir, ".cursor", "hooks.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("merge and unmerge are inverse over the user's own keys", () => {
  const theirs = { version: 1, hooks: { stop: [{ command: "x" }] }, other: true };
  const ours = { version: 1, hooks: { sessionStart: [{ command: "doctrina prime --hook cursor" }] } };
  const merged = mergeJson(theirs, ours);
  assert.deepEqual(unmergeJson(merged, ours), theirs);
  assert.equal(unmergeJson(ours, ours), null, "a file that is only ours is removed whole");
});

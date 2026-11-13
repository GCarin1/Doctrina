// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { CORE_SURFACE, COMMAND_NAMES, surfaceMarkdown } from "../src/lib/commands.js";

// THE HUB LISTS THE SESSION LOOP, AND THE REST IS ONE --help AWAY (change 0251).
//
// AGENTS.md is read on every turn and capped at 150 lines; the generated
// block spent 37 of them naming 39 commands, and this repository sat at
// 149/150 — the next command would not have fit. A session reaches for
// eight. The `core` profile names those and defers the rest to
// `doctrina --help`; `full` is the block as it always was.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project(/** @type {string[]} */ ...initArgs) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-surface-"));
  const run = (/** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const init = run(["init", "--non-interactive", "--project-name", "p", ...initArgs]);
  const agents = () => readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  const block = () => agents().match(/doctrina:surface:begin[\s\S]*?doctrina:surface:end/)?.[0] ?? "";
  return { dir, run, init, agents, block, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("the core profile is the loop, every name in it a real command, and it says where the rest is", () => {
  const core = surfaceMarkdown("core");
  for (const cmd of CORE_SURFACE) {
    assert.ok(COMMAND_NAMES.includes(cmd), `${cmd} is a command`);
    assert.match(core, new RegExp(`^- \`doctrina ${cmd}\\b.* — .*\\*When:\\* `, "m"), `${cmd} with its trigger`);
  }
  assert.match(core, /`doctrina --help` lists every command/);
  assert.ok(core.split("\n").length <= 14, `the block is ${core.split("\n").length} lines`);
  assert.ok(surfaceMarkdown("full").split("\n").length > 30);
  assert.equal(surfaceMarkdown(), surfaceMarkdown("full"), "with no profile named, the block is the one it always was");
});

test("a new project is born with the core profile, stored where upgrade reads it", () => {
  const p = project();
  try {
    assert.equal(JSON.parse(readFileSync(path.join(p.dir, ".doctrina", "config.json"), "utf8")).surface, "core");
    assert.match(p.block(), /- `doctrina work /);
    assert.doesNotMatch(p.block(), /doctrina decision|doctrina workspace|\*\*Orchestrate\*\*/);
    assert.ok(p.agents().split("\n").length <= 125, `AGENTS.md is ${p.agents().split("\n").length} lines`);
    assert.equal(p.run(["validate"]).status, 0);
    assert.doesNotMatch(p.run(["validate"]).out, /omits \d+ command/, "a hub that defers to --help is not a stale catalog");
    assert.match(p.run(["doctor"]).out, /ok {4}templates/);
    assert.doesNotMatch(p.run(["upgrade"]).out, /surface block is stale|regenerate the doctrina:surface/);
    assert.match(p.run(["doctor"]).out, /· surface {9}core \(the session loop\) +\.doctrina\/config\.json/);
  } finally {
    p.done();
  }
});

test("the profile is switched in config.json and upgrade regenerates the block", () => {
  const p = project("--surface", "full");
  try {
    assert.match(p.block(), /\*\*Orchestrate\*\*/);
    assert.equal(JSON.parse(readFileSync(path.join(p.dir, ".doctrina", "config.json"), "utf8")).surface, "full");
    const config = path.join(p.dir, ".doctrina", "config.json");
    writeFileSync(config, JSON.stringify({ surface: "core" }));
    assert.match(p.run(["upgrade"]).out, /regenerate the doctrina:surface block/);
    p.run(["upgrade", "--write"]);
    assert.doesNotMatch(p.block(), /\*\*Orchestrate\*\*/);
    assert.match(p.block(), /\*\*Everything else\*\*/);

    // A project with no key keeps the full list: nothing changes under an upgrade.
    writeFileSync(config, "{}");
    p.run(["upgrade", "--write"]);
    assert.match(p.block(), /\*\*Orchestrate\*\*/);

    writeFileSync(config, JSON.stringify({ surface: "tiny" }));
    assert.match(p.run(["validate"]).out, /config\.json: unknown surface "tiny" \(use "core" or "full"\)/);
  } finally {
    p.done();
  }
});

test("--surface refuses a value it does not know", () => {
  const p = project("--surface", "tiny");
  try {
    assert.equal(p.init.status, 2, p.init.out);
    assert.match(p.init.out, /--surface takes full or core \(got "tiny"\)/);
  } finally {
    p.done();
  }
});

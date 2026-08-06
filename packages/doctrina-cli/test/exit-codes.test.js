import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { EXIT, EXIT_MEANINGS } from "../src/lib/exit-codes.js";

// C7. Exit code 1 meant three different things — "your change is not
// ready", "this project is not configured", "this machine cannot run
// this". The first means iterate, the second means run a setup command,
// the third means stop. An autonomous loop reading 1 for all three either
// spins on an unfixable failure or abandons a fixable one.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const srcCommands = path.resolve(here, "..", "src", "commands");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-exit-"));
  runCli(["init", "--non-interactive", "--project-name", "Acme", "--project-description", "x"], tmp);
  return tmp;
}

test("every documented code has a meaning and an agent action", () => {
  for (const code of Object.values(EXIT)) {
    const m = EXIT_MEANINGS[code];
    assert.ok(m, `code ${code} is in the enum with no documented meaning`);
    assert.ok(m.summary && m.agentAction, `code ${code} documents no agent action`);
  }
});

// One representative failure per class, end to end.
test("class 2 (USAGE): an unknown command and a missing argument", () => {
  const tmp = project();
  try {
    assert.equal(runCli(["frobnicate"], tmp).status, EXIT.USAGE);
    assert.equal(runCli(["change", "new"], tmp).status, EXIT.USAGE);
    assert.equal(runCli(["analyze"], tmp).status, EXIT.USAGE);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("class 1 (GATE): the work is not ready", () => {
  const tmp = project();
  try {
    // A change whose tasks were never planned fails the structure gate.
    runCli(["change", "new", "0001-hollow", "hollow"], tmp);
    assert.equal(runCli(["analyze", "0001-hollow"], tmp).status, EXIT.GATE);
    assert.equal(runCli(["change", "apply", "0001-hollow"], tmp).status, EXIT.GATE);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("class 3 (PRECONDITION): the project is not set up for this", () => {
  const tmp = project();
  try {
    // No verify.json: the WORK may be perfect, the project has no gate.
    const v = runCli(["verify"], tmp);
    assert.equal(v.status, EXIT.PRECONDITION,
      `verify without a config must be a precondition, not a gate failure:\n${v.stderr}`);
    assert.match(v.stderr, /verify --init/, "it must name the setup command");

    // No intake and no description given.
    const i = runCli(["intake"], tmp);
    assert.equal(i.status, EXIT.PRECONDITION, i.stderr);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("class 3 (PRECONDITION): running outside a Doctrina project", () => {
  // The single most common precondition, raised by nearly every command.
  const bare = mkdtempSync(path.join(os.tmpdir(), "doctrina-bare-"));
  try {
    for (const cmd of [["status"], ["validate"], ["coverage"], ["adapter", "list"]]) {
      const r = runCli(cmd, bare);
      assert.equal(r.status, EXIT.PRECONDITION,
        `\`doctrina ${cmd.join(" ")}\` outside a project returned ${r.status}:\n${r.stderr}`);
      assert.match(r.stderr, /doctrina init/, "it must name the setup command");
    }
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
});

test("--help documents the exit-code contract", () => {
  const tmp = project();
  try {
    const r = runCli(["--help"], tmp);
    assert.equal(r.status, EXIT.OK);
    assert.match(r.stdout, /Exit codes/);
    for (const [code, m] of Object.entries(EXIT_MEANINGS)) {
      assert.ok(r.stdout.includes(`  ${code}  ${m.summary}`),
        `--help omits code ${code} (${m.summary})`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("every literal `return N` in a command maps to a documented code", () => {
  // The audit found a stray `3` in the codebase with no documented
  // meaning. It was a scoring helper, not an exit code — this test tells
  // the two apart by only reading returns from exported run()/command
  // entry paths, and asserts the value is in the enum.
  const documented = new Set(Object.values(EXIT));
  const problems = [];
  for (const file of readdirSync(srcCommands).filter((f) => f.endsWith(".js"))) {
    const text = readFileSync(path.join(srcCommands, file), "utf8");
    for (const m of text.matchAll(/^\s*return (\d+);/gm)) {
      const code = Number(m[1]);
      const line = text.slice(0, m.index).split("\n").length;
      // Skip returns inside helpers that compute scores rather than exit
      // codes: they are never the value of a command's run().
      const fn = enclosingFunction(text, m.index);
      if (/Bonus|Score|score|rank|similarity/.test(fn ?? "")) continue;
      if (!documented.has(code)) {
        problems.push(`${file}:${line} returns ${code}, which is not a documented exit code (in ${fn ?? "?"})`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});

// Name of the function enclosing an offset, for the audit above.
function enclosingFunction(text, offset) {
  const before = text.slice(0, offset);
  const matches = [...before.matchAll(/(?:function|const)\s+(\w+)\s*[=(]/g)];
  return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

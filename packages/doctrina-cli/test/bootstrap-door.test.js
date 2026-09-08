import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0066 — the bootstrap door is visible when it is needed.
//
// The AGENTS.md `init` installs said the trigger was "`.doctrina/intake.md`
// is `Status: pending`". `init` never writes that file, so the documented
// trigger could not fire on a freshly initialised project — and `prime`,
// `next` and `doctor` named `doctrina intake` nowhere. The one moment a new
// agent most needs the door, the door was invisible.
//
// The fix is not for `init` to write an empty pending intake: that would be a
// mould passing for content, which change 0065 just made refusable. The
// condition is read from what IS on disk — no capability spec yet.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function initialised() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-boot-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return dir;
}

test("init writes no intake.md, so the documented trigger must not depend on one", () => {
  const dir = initialised();
  try {
    assert.equal(existsSync(path.join(dir, ".doctrina", "intake.md")), false);
    const hub = readFileSync(path.join(dir, "AGENTS.md"), "utf8");
    const bootstrap = /- \*\*Bootstrap\.\*\*([\s\S]*?)\n- \*\*/.exec(hub);
    assert.ok(bootstrap, "the hub must carry a Bootstrap instruction");
    assert.match(bootstrap[1], /specs\//,
      "the trigger must name a condition `init` actually leaves on disk");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("right after init, the read path names the bootstrap command", () => {
  const dir = initialised();
  try {
    for (const cmd of [["next"], ["prime"]]) {
      const res = run(dir, cmd);
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /doctrina intake/,
        `${cmd[0]} must name the door on a project with nothing specced:\n${res.stdout}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the bootstrap action names the code-first door too", () => {
  const dir = initialised();
  try {
    const payload = JSON.parse(run(dir, ["next", "--json"]).stdout);
    const a = payload.actions.find((x) => x.id === "bootstrap-unspecced");
    assert.ok(a, JSON.stringify(payload.actions.map((x) => x.id)));
    assert.equal(a.command, "intake");
    assert.match(a.text, /--from-diff/,
      "adopting an existing codebase is the other door (ADR 0010)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the door closes the moment a capability exists", () => {
  const dir = initialised();
  try {
    assert.equal(run(dir, ["spec", "new", "invoicing"]).status, 0);
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    const payload = JSON.parse(run(dir, ["next", "--json"]).stdout);
    assert.ok(!payload.actions.some((x) => x.id === "bootstrap-unspecced"),
      JSON.stringify(payload.actions.map((x) => x.id)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a pending intake keeps its own action, and the two never both fire", () => {
  const dir = initialised();
  try {
    assert.equal(run(dir, ["intake", "--text", "A small invoicing tool for freelancers."]).status, 0);
    const payload = JSON.parse(run(dir, ["next", "--json"]).stdout);
    const ids = payload.actions.map((x) => x.id);
    assert.ok(ids.includes("intake-pending"), JSON.stringify(ids));
    assert.ok(!ids.includes("bootstrap-unspecced"),
      `one door at a time: ${JSON.stringify(ids)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a converted project is never sent back to the bootstrap", () => {
  const dir = initialised();
  try {
    assert.equal(run(dir, ["intake", "--text", "A small invoicing tool."]).status, 0);
    const p = path.join(dir, ".doctrina", "intake.md");
    writeFileSync(p, readFileSync(p, "utf8")
      .replace("- **Status:** pending", "- **Status:** converted"));
    const ids = JSON.parse(run(dir, ["next", "--json"]).stdout).actions.map((x) => x.id);
    assert.ok(!ids.includes("intake-pending"), JSON.stringify(ids));
    assert.ok(!ids.includes("bootstrap-unspecced"), JSON.stringify(ids));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository, which is specced and converted, is not nagged", () => {
  const ids = JSON.parse(run(repoRoot, ["next", "--json"]).stdout).actions.map((x) => x.id);
  assert.ok(!ids.includes("bootstrap-unspecced"), JSON.stringify(ids));
});

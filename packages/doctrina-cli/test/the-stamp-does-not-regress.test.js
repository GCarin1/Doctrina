import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import * as idx from "../src/lib/index-json.js";
import { cliVersion } from "../src/lib/version.js";

// Change 0116 — o carimbo não regride.
//
// The installed pre-commit hook called whichever `doctrina` was on the
// PATH; a global 0.15.0 ran under a 0.15.1 tree and rewrote the stamp
// backwards in silence. `validate` then warned while `index rebuild
// --check` — the CI gate — failed on the drift. Two teammates on different
// releases make the stamp ping-pong on every commit.
//
// `.git/hooks/` is local to the clone, so the hook pins the CLI that
// installed it (with `DOCTRINA=` as the override); and the stamp is
// monotonic: `save` never writes a version below the one the index holds,
// a stamp ahead of the running CLI is a reason to upgrade the CLI, and
// `rebuild --check` does not call it drift.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-stamp-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir }).status, 0);
  return dir;
}

function stamp(dir) {
  return JSON.parse(readFileSync(path.join(dir, ".doctrina", "index.json"), "utf8")).framework_version;
}

function setStamp(dir, version) {
  const p = path.join(dir, ".doctrina", "index.json");
  const index = JSON.parse(readFileSync(p, "utf8"));
  index.framework_version = version;
  writeFileSync(p, JSON.stringify(index, null, 2) + "\n");
}

test("the installed hook invokes the CLI that installed it, with DOCTRINA as the override", () => {
  const dir = project();
  assert.equal(run(dir, ["hooks", "install"]).status, 0);
  const hook = readFileSync(path.join(dir, ".git", "hooks", "pre-commit"), "utf8");
  assert.match(hook, /DOCTRINA="\$\{DOCTRINA:-/);
  assert.ok(hook.includes(cliEntry.replaceAll("\\", "/")), "the hook names the installing CLI's entrypoint");
  assert.match(hook, /\$DOCTRINA validate --fix/);
  assert.doesNotMatch(hook, /^doctrina validate/m, "no bare PATH lookup");
});

test("save never writes a stamp below the one the index holds", () => {
  const dir = project();
  setStamp(dir, "99.0.0");
  const index = idx.load(dir);
  idx.save(dir, index);
  assert.equal(stamp(dir), "99.0.0");
  setStamp(dir, "0.0.1");
  idx.save(dir, idx.load(dir));
  assert.equal(stamp(dir), cliVersion(), "a stamp behind is still migrated forward");
});

test("a stamp ahead survives validate --fix and index rebuild, is named as an upgrade, and is not drift", () => {
  const dir = project();
  setStamp(dir, "99.0.0");
  const fix = run(dir, ["validate", "--fix"]);
  assert.equal(fix.status, 0, fix.stdout);
  assert.equal(stamp(dir), "99.0.0");
  assert.match(fix.stdout, /framework_version is "99\.0\.0", ahead of the running CLI .* upgrade the CLI/);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  assert.equal(stamp(dir), "99.0.0");
  const check = run(dir, ["index", "rebuild", "--check"]);
  assert.equal(check.status, 0, check.stdout);
  assert.doesNotMatch(check.stdout, /drift: framework_version/);

  setStamp(dir, "0.0.1");
  const behind = run(dir, ["index", "rebuild", "--check"]);
  assert.equal(behind.status, 1, "a stamp behind is still drift");
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  assert.equal(stamp(dir), cliVersion());
});

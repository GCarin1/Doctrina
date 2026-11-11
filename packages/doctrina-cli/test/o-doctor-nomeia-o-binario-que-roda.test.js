// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { installsOnPath, runningPackageDir } from "../src/lib/install.js";

// THE DOCTOR NAMES THE BINARY THAT RUNS (change 0243).
//
// A maintainer updated through npm, the registry and the tarball both said
// 0.21.0, and `doctrina --version` answered 0.20.0: a second install, ahead
// on the PATH. The agent hooks call `doctrina` by name, so they ran the old
// one too — and nothing in the CLI could say so, because each install only
// knows its own version.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const posix = process.platform !== "win32";

/** A fake global install: <prefix>/bin/doctrina -> <prefix>/lib/node_modules/doctrina-cli/src/index.js */
function fakeInstall(root, name, version) {
  const pkg = path.join(root, name, "lib", "node_modules", "doctrina-cli");
  mkdirSync(path.join(pkg, "src"), { recursive: true });
  writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "doctrina-cli", version }));
  writeFileSync(path.join(pkg, "src", "index.js"), "");
  const bin = path.join(root, name, "bin");
  mkdirSync(bin, { recursive: true });
  symlinkSync(path.join(pkg, "src", "index.js"), path.join(bin, "doctrina"));
  return bin;
}

test("every doctrina on the PATH is found once, in the order a shell finds them", { skip: !posix }, () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-installs-"));
  try {
    const older = fakeInstall(root, "node18", "0.20.0");
    const newer = fakeInstall(root, "node22", "0.21.0");
    const found = installsOnPath({ PATH: [older, "/nonexistent", newer, older].join(":") }, "linux");
    assert.deepEqual(found.map((i) => i.version), ["0.20.0", "0.21.0"], "a directory listed twice is one install");
    assert.equal(found[0].bin, path.join(older, "doctrina"));
    assert.ok(found.every((i) => i.running === false), "neither is the CLI under test");
    assert.deepEqual(installsOnPath({ PATH: "" }, "linux"), []);
    assert.ok(runningPackageDir().endsWith("doctrina-cli"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("doctor says which install runs, and names another one ahead on the PATH", { skip: !posix }, () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-doctor-cli-"));
  try {
    const dir = path.join(root, "p");
    mkdirSync(dir);
    const run = (/** @type {string} */ PATH) => {
      const r = spawnSync(process.execPath, [cliEntry, "doctor"], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", PATH } });
      return r.stdout + r.stderr;
    };
    spawnSync(process.execPath, [cliEntry, "init", "--non-interactive", "--project-name", "p"], { cwd: dir, env: { ...process.env, NO_COLOR: "1" } });

    assert.match(run(path.join(root, "empty")),
      /ok {4}cli {14}\d+\.\d+\.\d+, run from .*\(no `doctrina` on the PATH\)/,
      "no hook calls it by name here, so a CLI run by path is not a finding");

    const older = fakeInstall(root, "old", "0.20.0");
    const out = run(older);
    assert.match(out, /warn {2}cli .* is running from .*, but `doctrina` on the PATH is .*old\/bin\/doctrina \(0\.20\.0\) — the hooks and every bare `doctrina` run that one/);
    assert.match(out, /fix: remove or update the other install/);

    // An adapter whose hooks call `doctrina` by name, and nothing on the PATH to answer.
    mkdirSync(path.join(dir, ".cursor"), { recursive: true });
    writeFileSync(path.join(dir, ".cursor", "hooks.json"), '{"version":1,"hooks":{"sessionStart":[{"command":"doctrina prime --hook cursor"}]}}');
    assert.match(run(path.join(root, "empty")), /warn {2}cli .* no `doctrina` is on the PATH — this project's agent hooks call it by name/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("doctor says whether the clone merges its artifacts by itself", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-doctor-merges-"));
  try {
    const env = { ...process.env, NO_COLOR: "1" };
    const run = (/** @type {string[]} */ args) => {
      const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env });
      return r.stdout + r.stderr;
    };
    run(["init", "--non-interactive", "--project-name", "p"]);
    assert.doesNotMatch(run(["doctor"]), / merges /, "not a git repository: nothing to merge");
    spawnSync("git", ["init", "-q"], { cwd: dir });
    assert.match(run(["doctor"]), /warn {2}merges {11}nothing is set up — two branches that each close a change stop on index\.json and the ledger\n\s+fix: doctrina hooks install/);
    run(["hooks", "install"]);
    assert.match(run(["doctor"]), /ok {4}merges {11}index\.json and the ledger merge by themselves/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

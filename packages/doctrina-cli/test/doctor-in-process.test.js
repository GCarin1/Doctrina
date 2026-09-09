import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { collectValidation } from "../src/lib/validation-model.js";
import { collectIndexDrift } from "../src/lib/scan.js";
import { collectReproducibility } from "../src/lib/reproducibility.js";

// Change 0045 — doctor stops spawning itself.
//
// `doctor` called two collectors in process and answered three of its rows by
// running `spawnSync(process.execPath, [cliEntry, "validate", "--json"])` and
// parsing its own JSON back: two integration styles inside one command, three
// extra Node processes per run, and a "did not produce a report" failure path
// that existed only because of the choice (audit finding F4).
//
// The property these pin is not "it is faster" — it is that a driver ASKS its
// collectors. The gates and the diagnostic then read the same collection, so
// they cannot answer the same question differently.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const cliEntry = path.resolve(here, "..", "src", "index.js");
const src = (rel) => readFileSync(path.resolve(here, "..", "src", rel), "utf8");

function runCli(args, cwd, env = {}) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", ...env },
  });
}

test("a doctor run is ONE cli invocation, proved by the usage log", () => {
  // The project's own instrumentation is the witness: every CLI process
  // appends one sample when DOCTRINA_USAGE_LOG names a file, and a spawned
  // child inherits the variable. Before this change the same run wrote four
  // lines — validate, index rebuild, verify, then doctor itself.
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-doctor-"));
  const log = path.join(dir, "usage.log");
  try {
    const r = runCli(["doctor"], repoRoot, { DOCTRINA_USAGE_LOG: log });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const samples = readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.deepEqual(samples.map((s) => s.operation), ["doctor"],
      "doctor must not start another doctrina process to answer a row");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor holds no way to start a process at all", () => {
  // Not a style rule: the moment one row shells out, "the diagnostic agrees
  // with the gate" stops being structural and becomes a coincidence of two
  // code paths.
  const text = src("commands/doctor.js");
  assert.doesNotMatch(text, /from "node:child_process"/, "doctor must not import a spawner");
  assert.doesNotMatch(text, /process\.execPath/, "doctor must not re-run this binary");
  assert.doesNotMatch(text, /did not produce a report/,
    "that failure path existed only because doctor parsed its own subprocess output");
});

test("the three collectors answer what their commands answer", () => {
  // Equivalence in both directions, on a project that is clean and then
  // broken: a collector that disagreed with the command rendering it would
  // reintroduce exactly the divergence this change removes.
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-agree-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);

    assert.equal(collectIndexDrift(dir).ok, true);
    assert.equal(runCli(["index", "rebuild", "--check"], dir).status, 0);

    const clean = collectValidation(dir);
    assert.equal(runCli(["validate"], dir).status, clean.errors.length === 0 ? 0 : 1);

    // Break the index: a spec on disk that the index has never heard of.
    runCli(["spec", "new", "billing"], dir);
    const idxPath = path.join(dir, ".doctrina", "index.json");
    const index = JSON.parse(readFileSync(idxPath, "utf8"));
    index.artifacts.specs = [];
    writeFileSync(idxPath, JSON.stringify(index, null, 2));

    const drifted = collectIndexDrift(dir);
    assert.equal(drifted.ok, false);
    assert.ok(drifted.drift.length > 0, "drift must be described, not just flagged");
    assert.equal(runCli(["index", "rebuild", "--check"], dir).status, 1);

    // And doctor reports that same drift as a failing row.
    const doc = runCli(["doctor"], dir);
    assert.equal(doc.status, 1, doc.stdout);
    assert.match(doc.stdout, /FAIL\s+index\s+index\.json has drifted from the tree/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the reproducibility lint reports what it finds and prints nothing", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-repro-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    assert.deepEqual(collectReproducibility(dir), { packages: 0, findings: [] });

    // An entry point into a build directory with nothing that builds it.
    writeFileSync(path.join(dir, "package.json"),
      JSON.stringify({ name: "acme", main: "dist/index.js" }, null, 2));
    const found = collectReproducibility(dir);
    assert.equal(found.packages, 1);
    assert.equal(found.findings.length, 1);
    assert.match(found.findings[0], /build output/);
    assert.equal(runCli(["verify", "--clean"], dir).status, 1);
    assert.equal(runCli(["doctor"], dir).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validate repairs only when asked, and says what it repaired", () => {
  // The collector's one impure option. `doctor` never passes it — a
  // diagnostic that fixed the tree while reporting on it could not be run to
  // find out what is wrong.
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-fix-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    runCli(["spec", "new", "billing"], dir);
    const idxPath = path.join(dir, ".doctrina", "index.json");
    const index = JSON.parse(readFileSync(idxPath, "utf8"));
    index.artifacts.specs = [];
    writeFileSync(idxPath, JSON.stringify(index, null, 2));

    const read = collectValidation(dir);
    assert.deepEqual(read.fixes, [], "a plain collection must not write");
    assert.equal(JSON.parse(readFileSync(idxPath, "utf8")).artifacts.specs.length, 0);

    const repaired = collectValidation(dir, { fix: true });
    assert.ok(repaired.fixes.some((f) => /rebuilt .*index\.json/.test(f)),
      "a repair must be reported to the caller, not printed from inside the collection");
    assert.equal(JSON.parse(readFileSync(idxPath, "utf8")).artifacts.specs.length, 1);
    assert.ok(existsSync(path.join(dir, ".doctrina", "specs", "billing", "spec.md")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

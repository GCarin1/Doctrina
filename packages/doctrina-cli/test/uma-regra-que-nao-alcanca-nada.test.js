// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { EXIT } from "../src/lib/exit-codes.js";

// A DECLARATION THAT REACHES NOTHING IS NOT A CONSTRAINT.
//
// This framework has ruled on that question twice already, and wrote the
// reasoning into the code both times: a `**Source:**` glob matching no file
// "reads as coverage and provides none", and RT05 says the same about a
// selector that matches no target.
//
// A project RULE is the strongest of the three — a permanent constraint the
// project believes is enforced on every `validate` — and it was the one that
// said nothing. Point `paths` at a directory that does not exist and the rule
// never runs, `validate` exits 0, and `doctor` goes on counting it among the
// configured options, which confirms the false belief rather than correcting
// it.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project(rules) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-regra-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  mkdirSync(path.join(dir, "src"), { recursive: true });
  writeFileSync(path.join(dir, "src", "app.js"), 'console.log("oi");\n');
  const cfgPath = path.join(dir, ".doctrina", "config.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  cfg.rules = rules;
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  return dir;
}

const RULE = { id: "sem-console", forbid: "console\\.log", message: "use o logger" };

test("a rule scoped to nothing is reported, not silently skipped", () => {
  const dir = project([{ ...RULE, paths: ["naoexiste/**"] }]);
  try {
    const r = runCli(["validate"], dir);
    assert.equal(r.status, EXIT.OK, "a dead scope is a warning, like the Source glob it mirrors");
    assert.match(r.stdout, /rule "sem-console" scopes to `naoexiste\/\*\*`, which matches no file/);
    assert.match(r.stdout, /declared and never enforced/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a rule that reaches files and finds nothing stays quiet", () => {
  const dir = project([{ id: "r", forbid: "zzz-nunca-aparece", paths: ["src/**"] }]);
  try {
    const r = runCli(["validate"], dir);
    assert.equal(r.status, EXIT.OK);
    assert.doesNotMatch(r.stdout, /matches no file/,
      "reaching files and finding no violation is a healthy rule, not a dead one");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a rule that reaches files and finds one is still an error", () => {
  const dir = project([{ ...RULE, paths: ["src/**"] }]);
  try {
    const r = runCli(["validate"], dir);
    assert.equal(r.status, EXIT.GATE);
    assert.match(r.stdout, /rule "sem-console": src\/app\.js:1 matches forbidden pattern — use o logger/);
    assert.doesNotMatch(r.stdout, /matches no file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// An omitted scope is not a claim about where the rule applies, so it cannot
// be a dead one — the rule simply covers the tree.
test("a rule that declares no paths is not reported as dead", () => {
  const dir = project([{ id: "r", forbid: "zzz-nunca-aparece" }]);
  try {
    const r = runCli(["validate"], dir);
    assert.equal(r.status, EXIT.OK);
    assert.doesNotMatch(r.stdout, /matches no file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The reach is counted before the per-rule hit cap, or a rule noisy enough to
// be suppressed would look like a rule that reached nothing.
test("a rule suppressed by its own hit cap is not called dead", () => {
  const dir = project([{ ...RULE, paths: ["src/**"] }]);
  try {
    for (let i = 0; i < 14; i += 1) {
      writeFileSync(path.join(dir, "src", `f${i}.js`), 'console.log("x");\n');
    }
    const r = runCli(["validate"], dir);
    assert.equal(r.status, EXIT.GATE);
    assert.match(r.stdout, /more matches suppressed after/);
    assert.doesNotMatch(r.stdout, /matches no file/,
      "hitting the cap proves the rule reached plenty of files");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

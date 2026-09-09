import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/lib/config.js";

// Change 0115 — o doctor lê o config que existe.
//
// With `.doctrina/config.json` = `not json`, doctor printed
//   FAIL  validate   1 error · .doctrina/config.json is not valid JSON
//   ok    config     all 3 options at their defaults
// on the same screen. The config row read the effective values and never
// the load errors. And `{"context_budjet": 1}` was silence at every door.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project(config) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-config-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  writeFileSync(path.join(dir, ".doctrina", "config.json"), config);
  return dir;
}

test("loadConfig reports the keys it does not know", () => {
  const dir = project('{ "$comment": "x", "context_budjet": 10, "langauge": "pt" }');
  const cfg = loadConfig(dir);
  assert.deepEqual(cfg.unknown, ["context_budjet", "langauge"]);
  assert.deepEqual(cfg.errors, []);
  assert.deepEqual(loadConfig(project('{ "language": "pt" }')).unknown, []);
});

test("an invalid config fails the doctor's config row, naming the error", () => {
  const dir = project("not json");
  const res = run(dir, ["doctor"]);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /FAIL\s+config\s+.*config\.json is not valid JSON/);
  assert.doesNotMatch(res.stdout, /ok\s+config/);
  const bad = run(project('{ "language": "xx" }'), ["doctor"]);
  assert.match(bad.stdout, /FAIL\s+config\s+.*unknown language "xx"/);
});

test("a misspelled key is a warning in validate and in doctor, naming the valid keys", () => {
  const dir = project('{ "context_budjet": 10 }');
  const validate = run(dir, ["validate"]);
  assert.equal(validate.status, 0, "a warning, not an error");
  assert.match(validate.stdout, /warn: .*config\.json: unknown key "context_budjet" .*language, context_budget, rules/);
  const doctor = run(dir, ["doctor"]);
  assert.match(doctor.stdout, /warn\s+config\s+.*unknown key "context_budjet"/);
  const clean = run(project('{ "context_budget": 10 }'), ["doctor"]);
  assert.match(clean.stdout, /ok\s+config\s+1 of 3 options configured/);
});

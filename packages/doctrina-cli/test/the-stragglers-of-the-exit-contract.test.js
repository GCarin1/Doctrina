import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0114 — os retardatários do contrato de saída.
//
// Three leftovers after change 0093:
//   close 0099                → exit 1 (every sibling that takes a change id → 2)
//   change tick <id> abc      → "no box #NaN"   (fixed by 0104, pinned here)
//   verify --json, check writing to stderr → the child's stderr printed
//        BEFORE the JSON, the envelope said "stderr": [], lines carried \r

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-stragglers-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  return dir;
}

test("close of a change that does not resolve is the usage class, before any step runs", () => {
  const dir = project();
  const res = run(dir, ["close", "0099-nao-existe"]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /change "0099-nao-existe" not found/);
  assert.doesNotMatch(res.stdout, /1\/12 analyze/, "no step was sequenced");
});

test("tick with a non-number names the argument, never NaN", () => {
  const dir = project();
  assert.equal(run(dir, ["change", "new", "0001-x", "X"]).status, 0);
  const res = run(dir, ["change", "tick", "0001-x", "abc"]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /no box "abc"/);
  assert.doesNotMatch(res.stderr, /NaN/);
});

test("verify --json keeps stdout pure JSON and carries the child's stderr in the envelope, without CR", () => {
  const dir = project();
  const script = path.join(dir, "noisy.js");
  writeFileSync(script, "process.stdout.write('out line\\r\\n'); process.stderr.write('err line\\r\\n'); process.exit(1);\n");
  writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({
    checks: [{ name: "noisy", run: `"${process.execPath}" "${script}"` }],
  }));
  const res = run(dir, ["verify", "--json"]);
  assert.equal(res.status, 1);
  assert.equal(res.stderr, "", "nothing escapes to the real stderr");
  const envelope = JSON.parse(res.stdout);
  assert.equal(envelope.ok, false);
  assert.equal(envelope.exit_code, 1);
  assert.ok(envelope.stdout.includes("out line"), JSON.stringify(envelope.stdout));
  assert.ok(envelope.stderr.includes("err line"), JSON.stringify(envelope.stderr));
  for (const line of [...envelope.stdout, ...envelope.stderr]) assert.doesNotMatch(line, /\r/);
});

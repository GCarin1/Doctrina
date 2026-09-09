import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { checkStructure, collectRuntimeFindings } from "../src/lib/runtime.js";

// Change 0103 — o close roda o contract check inteiro.
//
// `contract check` had two halves: the structural checks written inline in
// the command (port collisions, .env.example drift, references to specs that
// do not exist) and RT01-RT05 in lib/runtime.js. `close`'s runtime step drove
// the lib collection only — so a contract with port 8080 claimed twice and a
// reference to a spec that did not exist failed `contract check` with 2
// errors and passed the close as "2 declared rows hold". The comment above
// the step said the two could never disagree. They did.
//
// The structural half is now findings in the same collection (CT01-CT03),
// read by `contract check`, the close and `doctor` alike.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const CONTRACT = `# Contract — api

**Contract:** api
**Status:** active
**Last updated:** 2026-09-09

## Ports

| Service | Port | Protocol |
|---------|------|----------|
| gateway | 8080 | http     |
| worker  | 8080 | http     |

## Environment

| Variable     | Required | Values | Example |
|--------------|----------|--------|---------|
| DATABASE_URL | yes      | —      | x       |
| SECRET_KEY   | yes      | —      | y       |

## References

- \`specs/carteira\`
- \`specs/fantasma\`
`;

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-ct-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira de investimentos"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  assert.equal(run(dir, ["contract", "new", "api"]).status, 0);
  writeFileSync(path.join(dir, ".doctrina", "contracts", "api.md"), CONTRACT);
  writeFileSync(path.join(dir, ".env.example"), "DATABASE_URL=postgres://x\n");
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
  return dir;
}

test("the structural half is findings with codes, in the same collection as RT01-RT05", () => {
  const dir = project();
  const codes = checkStructure(dir, CONTRACT).map((f) => `${f.code}:${f.level}`);
  assert.deepEqual(codes, ["CT01:error", "CT02:warn", "CT03:error"]);
  const all = collectRuntimeFindings(dir);
  assert.equal(all.contracts, 1);
  assert.deepEqual(all.findings.map((f) => f.code), ["CT01", "CT02", "CT03"]);
  assert.ok(all.findings.every((f) => f.contract === ".doctrina/contracts/api.md"));
});

test("contract check, the close and doctor fail the same contract for the same reasons", () => {
  const dir = project();
  const check = run(dir, ["contract", "check"]);
  assert.equal(check.status, 1);
  assert.match(check.stdout, /port 8080 is claimed by both "gateway" and "worker" \[CT01\]/);
  assert.match(check.stdout, /references spec "fantasma" .* does not exist \[CT03\]/);
  assert.match(check.stdout, /env var SECRET_KEY is in the contract but absent from \.env\.example \[CT02\]/);

  // A chore change with nothing else to block on: the close must stop at
  // the runtime step, on the findings `contract check` just reported.
  assert.equal(run(dir, ["change", "new", "0001-chore", "Chore", "--chore"]).status, 0);
  const changeDir = path.join(dir, ".doctrina", "changes", "0001-chore");
  const tasks = readFileSync(path.join(changeDir, "tasks.md"), "utf8")
    .replace(/- \[ \]\r?\n- \[ \]\r?\n- \[ \]\r?\n/, "- [x] tidy\n");
  writeFileSync(path.join(changeDir, "tasks.md"), tasks);
  const proposal = readFileSync(path.join(changeDir, "proposal.md"), "utf8")
    .replace(/## Why\r?\n\r?\n[^\r\n]*/, "## Why\n\nThe wiring drifted and the contract names the gaps.")
    .replace("<!-- The shape of the change: artifacts created or modified, specs affected. -->", "Tidy the workflow.")
    .replace("<!-- Anything adjacent that this change deliberately does NOT touch. -->", "No spec changes.");
  writeFileSync(path.join(changeDir, "proposal.md"), proposal);
  assert.equal(run(dir, ["change", "tick", "0001-chore", "--all"]).status, 0);

  const close = run(dir, ["close", "0001-chore"]);
  assert.equal(close.status, 1);
  assert.match(close.stdout, /close stopped at "runtime"/);
  assert.match(close.stdout, /\[CT01\]/);
  assert.match(close.stdout, /\[CT03\]/);
  assert.match(close.stderr, /2 contract findings block the close/);

  const doctor = run(dir, ["doctor"]);
  assert.match(doctor.stdout, /FAIL\s+runtime/);
  assert.match(doctor.stdout, /CT01 port 8080/);
});

test("a contract with no structural defect and no rows is unchecked, not failed", () => {
  const dir = project();
  const clean = CONTRACT.replace("| worker  | 8080 | http     |\n", "").replace("- `specs/fantasma`\n", "");
  writeFileSync(path.join(dir, ".doctrina", "contracts", "api.md"), clean);
  const check = run(dir, ["contract", "check"]);
  assert.equal(check.status, 0, check.stdout);
  assert.match(check.stdout, /\[CT02\]/);
  assert.match(check.stdout, /runtime surface is unchecked/);
});

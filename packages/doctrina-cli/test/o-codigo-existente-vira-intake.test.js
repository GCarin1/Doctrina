// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { envNames, inventory } from "../src/lib/code-inventory.js";

// AN EXISTING CODEBASE BECOMES THE INTAKE (change 0221).
//
// A repository that already has code and no specs has no description to
// hand the bootstrap — its truth is the code. `intake --from-code` stores
// the code INVENTORY as the intake (facts only: manifests, counts, names)
// and prints the absorb playbook, which asks for what the code does today.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function codebase() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-absorb-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(dir, ".home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env });
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({
    name: "loja", scripts: { test: "vitest run", lint: "eslint ." },
    dependencies: { react: "18", express: "4" }, devDependencies: { vitest: "1", "@playwright/test": "1" },
  }));
  writeFileSync(path.join(dir, "README.md"), "# Loja\n\nA loja online da empresa.\n");
  writeFileSync(path.join(dir, ".env.example"), "API_URL=https://api.example\nexport PAYMENT_KEY=sk_live_secret\n");
  for (const f of ["src/checkout/pay.ts", "src/checkout/cart.ts", "src/login/form.tsx", "tests/checkout.spec.ts"]) {
    mkdirSync(path.join(dir, path.dirname(f)), { recursive: true });
    writeFileSync(path.join(dir, f), "export {};\n");
  }
  mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
  writeFileSync(path.join(dir, ".github", "workflows", "ci.yml"), "on: push\n");
  assert.equal(run(["init", "--non-interactive", "--project-name", "loja", "--project-description", "loja"]).status, 0);
  return { dir, run, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("intake --from-code stores the inventory and prints the absorb playbook", () => {
  const s = codebase();
  try {
    const r = s.run(["intake", "--from-code"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Absorb playbook/);
    assert.match(r.stdout, /never guess intent/);
    const intake = readFileSync(path.join(s.dir, ".doctrina", "intake.md"), "utf8");
    assert.match(intake, /- \*\*Status:\*\* pending/);
    assert.match(intake, /code inventory/);
    assert.match(intake, /Node\.js/);
    assert.match(intake, /React/);
    assert.match(intake, /Playwright/);
    assert.doesNotMatch(intake, /Expo/, "express is not read as expo");
    assert.match(intake, /`src\/checkout\/` — 2 files/);
    assert.match(intake, /`npm run test`/);
    assert.match(intake, /GitHub Actions/);
    assert.match(intake, /`API_URL`, `PAYMENT_KEY`/);
    assert.doesNotMatch(intake, /sk_live_secret|api\.example/, "a value is never read");
    assert.match(intake, /A loja online da empresa\./);
  } finally {
    s.done();
  }
});

test("intake --from-code refuses a converted intake and a pending one without --force", () => {
  const s = codebase();
  try {
    assert.equal(s.run(["intake", "--from-code"]).status, 0);
    assert.equal(s.run(["intake", "--from-code"]).status, 3, "a pending intake needs --force");
    assert.equal(s.run(["intake", "--from-code", "--force"]).status, 0);
    assert.equal(s.run(["intake", "--converted", "--force"]).status, 0);
    const again = s.run(["intake", "--from-code", "--force"]);
    assert.equal(again.status, 3);
    assert.match(again.stderr, /already converted/);
  } finally {
    s.done();
  }
});

test("inside a workspace the playbook says so", () => {
  const s = codebase();
  try {
    const ws = path.join(s.dir, ".ws");
    const env = { ...process.env, NO_COLOR: "1", DOCTRINA_WORKSPACE: ws };
    spawnSync(process.execPath, [cliEntry, "workspace", "init", ws, "--no-git"], { cwd: s.dir, encoding: "utf8", env });
    const r = spawnSync(process.execPath, [cliEntry, "intake", "--from-code"], { cwd: s.dir, encoding: "utf8", env });
    assert.match(r.stdout, /belongs to the workspace/);
  } finally {
    s.done();
  }
});

test("env names are read without values, and the inventory is deterministic", () => {
  assert.deepEqual(envNames("A=1\n# B=2\nexport C_D=x\nlower=1\n"), ["A", "C_D"]);
  const s = codebase();
  try {
    assert.deepEqual(inventory(s.dir), inventory(s.dir));
  } finally {
    s.done();
  }
});

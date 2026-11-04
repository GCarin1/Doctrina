// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// `verify --init` STARTS FROM THE INVENTORY (change 0228).
//
// The absorb playbook declares the build gate "from the inventory's
// candidate commands", and the inventory lists them under a heading that
// names `verify --init` — which then wrote `exit 1` anyway, leaving the
// agent to copy by hand what the CLI had just read. It writes the project's
// own scripts now, for the human to confirm, and keeps the fail-closed
// example for a project whose manifests declare none.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-verify-init-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return { dir, run };
}

test("verify --init seeds the checks from the commands the code inventory finds", () => {
  const { dir, run } = project();
  try {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "acme", scripts: { test: "node -e 0", build: "node -e 0", start: "node ." } }));
    const init = run(["verify", "--init"]);
    assert.equal(init.status, 0, init.stderr || init.stdout);
    assert.match(init.stdout, /seeded from the code inventory: npm run test, npm run build/);
    const cfg = JSON.parse(readFileSync(path.join(dir, ".doctrina", "verify.json"), "utf8"));
    assert.deepEqual(cfg.checks, [{ name: "test", run: "npm run test" }, { name: "build", run: "npm run build" }],
      "the project's test and build scripts, never `start`");
    assert.match(cfg.$comment, /seeded from the project's own manifests/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("with no candidate command, verify --init keeps the fail-closed example", () => {
  const { dir, run } = project();
  try {
    assert.equal(run(["verify", "--init"]).status, 0);
    const cfg = JSON.parse(readFileSync(path.join(dir, ".doctrina", "verify.json"), "utf8"));
    assert.deepEqual(cfg.checks, [{ name: "example", run: "exit 1" }], "a gate nobody declared must not pass");
    assert.equal(run(["verify"]).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

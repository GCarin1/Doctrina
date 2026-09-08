import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { documentationHomes, docsRemedy } from "../src/lib/docs-impact.js";

// Change 0058 — the remediation comes out of the project being checked.
//
// The docs gate is portable. The instruction it printed was not: it named
// `docs/en/` AND `docs/pt/` and a skill that exists only in Doctrina's own
// repository, so an adopting project with neither read that it had to
// translate its documentation. The gate never asked for any of that — it
// accepts anything under `docs/` or a README.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-remedy-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return dir;
}

test("a project with no documentation is not sent to directories it lacks", () => {
  const dir = project();
  try {
    rmSync(path.join(dir, "README.md"), { force: true });
    assert.deepEqual(documentationHomes(dir), []);
    const hint = docsRemedy(dir);
    assert.doesNotMatch(hint, /docs\/en|docs\/pt|keep-docs-en-pt-parity/, hint);
    assert.match(hint, /README/, hint);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a project with one documentation language is told about that one", () => {
  const dir = project();
  try {
    mkdirSync(path.join(dir, "docs", "guide"), { recursive: true });
    writeFileSync(path.join(dir, "docs", "guide", "cli.md"), "# CLI\n");
    const homes = documentationHomes(dir);
    assert.ok(homes.includes("docs/guide/"), JSON.stringify(homes));
    const hint = docsRemedy(dir);
    assert.match(hint, /docs\/guide\//, hint);
    assert.doesNotMatch(hint, /docs\/pt|keep-docs-en-pt-parity/, hint);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a flat docs/ directory is named as itself", () => {
  const dir = project();
  try {
    mkdirSync(path.join(dir, "docs"), { recursive: true });
    writeFileSync(path.join(dir, "docs", "cli.md"), "# CLI\n");
    assert.ok(documentationHomes(dir).includes("docs/"), JSON.stringify(documentationHomes(dir)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("in this repository the hint still names both languages, because they exist here", () => {
  const homes = documentationHomes(repoRoot);
  assert.ok(homes.includes("docs/en/"), JSON.stringify(homes));
  assert.ok(homes.includes("docs/pt/"), JSON.stringify(homes));
  const hint = docsRemedy(repoRoot);
  assert.match(hint, /docs\/en\//, hint);
  assert.match(hint, /docs\/pt\//, hint);
});

test("the close's docs refusal prints the project's own remedy", () => {
  const dir = project();
  try {
    spawnSync("git", ["init", "-q", "."], { cwd: dir });
    rmSync(path.join(dir, "README.md"), { force: true });
    mkdirSync(path.join(dir, "docs", "manual"), { recursive: true });
    writeFileSync(path.join(dir, "docs", "manual", "cli.md"), "# CLI\n");

    assert.equal(run(dir, ["spec", "new", "billing"]).status, 0);
    // Point the scaffold's placeholder criterion at a file that exists, so
    // the close reaches the docs step instead of stopping at coverage.
    const specPath = path.join(dir, ".doctrina", "specs", "billing", "spec.md");
    writeFileSync(specPath, readFileSync(specPath, "utf8").replace("path/to/test", "docs/manual/cli.md"));

    const changeDir = path.join(dir, ".doctrina", "changes", "0001-x");
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(path.join(changeDir, "proposal.md"),
      "# Change 0001-x — x\n\n- **Status:** proposed\n- **Affects specs:** billing\n\n" +
      "## Why\n\nThe close gains a `--dry-run` flag.\n\n## What\n\n`doctrina close` gains `--dry-run`.\n");
    writeFileSync(path.join(changeDir, "tasks.md"), "# Tasks\n\n- [x] ship it\n");
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    spawnSync("git", ["add", "-A"], { cwd: dir });
    spawnSync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "base"], { cwd: dir });

    const res = run(dir, ["close", "0001-x"]);
    const out = res.stdout + res.stderr;
    assert.match(out, /stopped at "docs"/, out);
    assert.match(out, /hint: document it in docs\/manual\//, out);
    assert.doesNotMatch(out, /docs\/en|docs\/pt|keep-docs-en-pt-parity/, out);
    assert.doesNotMatch(out, /EN \+ PT/, out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { globToRegExp, filesMatching } from "../src/lib/runtime.js";
import { declaredOwners } from "../src/lib/work-model.js";

// A `**Source:**` WRITTEN AS A DIRECTORY CLAIMS THE DIRECTORY (change 0199).
//
// Auditing an adopting project: three specs declared `src/health/`,
// `src/squads/`, `src/cloud/` — the natural way to say "this module is
// mine" — and `validate` answered that each pattern matched no file. The
// glob compiled to the literal path `src/health/`, which no file has, so
// the declaration claimed nothing and every file under it was ownerless.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("a trailing slash means everything under the directory", () => {
  const re = globToRegExp("src/health/");
  assert.ok(re.test("src/health/index.js"));
  assert.ok(re.test("src/health/deep/x.ts"));
  assert.ok(!re.test("src/healthcheck.js"));
  assert.ok(!re.test("src/squads/index.js"));
  // The forms that already worked are unchanged.
  assert.ok(globToRegExp("src/health/**").test("src/health/index.js"));
  assert.ok(!globToRegExp("src/health").test("src/health/index.js"));
});

test("validate stays quiet and review finds the owner for a directory Source", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-dir-source-"));
  try {
    const run = (args) => spawnSync(process.execPath, [cliEntry, ...args], {
      cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
    });
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    mkdirSync(path.join(dir, "src", "health"), { recursive: true });
    writeFileSync(path.join(dir, "src", "health", "index.js"), "export const h = 1;\n");
    assert.equal(run(["spec", "new", "health"]).status, 0);
    const spec = path.join(dir, ".doctrina", "specs", "health", "spec.md");
    const text = readFileSync(spec, "utf8")
      .replace(/^\*\*Version:\*\*/m, "**Source:** `src/health/`\n**Version:**");
    writeFileSync(spec, text);
    assert.equal(run(["index", "rebuild"]).status, 0);
    assert.equal(filesMatching(dir, "src/health/").length, 1);
    assert.deepEqual(declaredOwners(dir, "src/health/index.js"), ["health"]);
    const out = run(["validate"]);
    assert.doesNotMatch(out.stdout + out.stderr, /src\/health\/` matches no file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

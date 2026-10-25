// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE PROPOSAL NAMES THE SPEC ITS DELTA TARGETS (change 0207).
//
// Auditing an adopting project: `work "Add a version constant to health"`
// scaffolded `specs/health/delta.md` from the ranking and left the
// proposal's `Affects specs:` empty. Only a pinned capability filled it.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("a guessed delta and a change delta both name their capability in Affects specs, once", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-affects-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    for (const cap of ["health", "cloud"]) {
      assert.equal(run(["spec", "new", cap]).status, 0);
      const spec = path.join(dir, ".doctrina", "specs", cap, "spec.md");
      writeFileSync(spec, readFileSync(spec, "utf8").replace("## Purpose", `## Purpose\n\nThe ${cap} module reports ${cap} status and version.\n`));
    }
    assert.equal(run(["index", "rebuild"]).status, 0);
    const out = run(["work", "Report the health version", "--quiet"]);
    assert.equal(out.status, 0, out.stderr);
    const id = /opened (\S+)/.exec(out.stdout)?.[1];
    assert.ok(id, out.stdout);
    const proposal = path.join(dir, ".doctrina", "changes", id, "proposal.md");
    assert.match(readFileSync(proposal, "utf8"), /^- \*\*Affects specs:\*\* health$/m);

    assert.equal(run(["change", "delta", id, "cloud", "--bump", "patch"]).status, 0);
    assert.equal(run(["change", "delta", id, "cloud", "--bump", "minor"]).status, 0);
    assert.match(readFileSync(proposal, "utf8"), /^- \*\*Affects specs:\*\* health, cloud$/m, "named once");
    const v = run(["validate"]);
    assert.doesNotMatch(v.stdout + v.stderr, /metadata differs/, "the index followed the header");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

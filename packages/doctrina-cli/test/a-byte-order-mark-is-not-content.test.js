import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { read } from "../src/lib/fs-ops.js";

// Change 0098 — a byte-order mark is an encoding artifact, not content.
//
// A spec saved by a Windows editor opens `﻿# Spec — …`. `validate`
// reported "carries no title" while `show`, `spec list` and `coverage` read
// the same file without complaint (third audit, finding 5): the surfaces
// disagreed about a file none of them had a real problem with, and the one
// that refused named a cause that was not the cause.
//
// Removed once at the door — `fs-ops.read()` — so no parser downstream has
// to know the mark exists. It matters beyond Markdown: `JSON.parse` throws
// on a leading BOM, so an index.json written by the wrong editor failed
// with an error naming neither the cause nor the file.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const BOM = "﻿";

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-bom-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
  return dir;
}

function prefixWithBom(file) {
  const before = readFileSync(file, "utf8");
  assert.notEqual(before.charCodeAt(0), 0xFEFF, "the fixture starts without a mark");
  writeFileSync(file, BOM + before);
}

test("read strips the mark, and only when it is there", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-bom-unit-"));
  try {
    const marked = path.join(dir, "marked.md");
    writeFileSync(marked, BOM + "# Title\n\nbody\n");
    assert.equal(read(marked), "# Title\n\nbody\n");

    const plain = path.join(dir, "plain.md");
    writeFileSync(plain, "# Title\n\nbody\n");
    assert.equal(read(plain), "# Title\n\nbody\n");

    // Only the LEADING mark. One mid-file is real content, however odd.
    const inner = path.join(dir, "inner.md");
    writeFileSync(inner, `# Title\n\nbody ${BOM} more\n`);
    assert.equal(read(inner), `# Title\n\nbody ${BOM} more\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a spec saved with a mark still has its title", () => {
  const dir = project();
  try {
    prefixWithBom(path.join(dir, ".doctrina", "specs", "carteira", "spec.md"));

    const validated = run(dir, ["validate"]);
    assert.doesNotMatch(validated.stdout + validated.stderr, /carries no title/,
      "the mark must not read as a missing title");
    assert.equal(validated.status, 0, validated.stdout + validated.stderr);

    // And the surfaces that never complained still agree.
    assert.match(run(dir, ["show", "carteira"]).stdout, /^# Spec — carteira$/m);
    assert.match(run(dir, ["spec", "list"]).stdout, /carteira/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an index.json saved with a mark is still readable", () => {
  // `JSON.parse` throws on a leading mark, and the failure named neither
  // the cause nor the file.
  const dir = project();
  try {
    prefixWithBom(path.join(dir, ".doctrina", "index.json"));
    const validated = run(dir, ["validate"]);
    assert.equal(validated.status, 0, validated.stdout + validated.stderr);
    assert.doesNotMatch(validated.stdout + validated.stderr, /not valid JSON/);
    assert.equal(run(dir, ["status"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every surface reads the same marked tree the same way", () => {
  // The shape of the defect was disagreement, so this is the assertion that
  // matters: mark everything, and no gate changes its mind.
  const dir = project();
  try {
    for (const rel of [["AGENTS.md"], [".doctrina", "product.md"],
                       [".doctrina", "specs", "carteira", "spec.md"]]) {
      prefixWithBom(path.join(dir, ...rel));
    }
    for (const argv of [["validate"], ["coverage"], ["trace"], ["status"], ["prime"]]) {
      const r = run(dir, argv);
      assert.equal(r.status, 0, `${argv[0]} refused a marked tree:\n${r.stdout}${r.stderr}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { productSection, hasProductSection } from "../src/lib/constitution-model.js";

// Change 0069 — a non-goal written as prose counts.
//
// `product.md` carried a filled `## Non-goals` section, in prose. `prime
// --rules` reported "none declared — add a `## Non-goals` section to
// product.md": it read only bullets, while the section's own template comment
// — "Explicit things this project will NOT try to be." — asks for no bullets
// and invites prose. Rule C2, which this repository has a whole suite for: a
// finding may only name a remedy that resolves it. That one named an act the
// author had already done.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project(nonGoals) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-goals-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  if (nonGoals !== undefined) {
    const p = path.join(dir, ".doctrina", "product.md");
    writeFileSync(p, readFileSync(p, "utf8")
      .replace("<!-- Explicit things this project will NOT try to be. -->", nonGoals));
  }
  return dir;
}

test("a section written as prose is read as declared", () => {
  const dir = project("Ledgerly will not become a general accounting package,\nand will not hold client funds.");
  try {
    const goals = productSection(dir, "Non-goals");
    assert.equal(goals.length, 1, JSON.stringify(goals));
    assert.match(goals[0], /general accounting package, and will not hold client funds\./);
    assert.match(run(dir, ["prime", "--rules"]).stdout, /general accounting package/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("two paragraphs are two non-goals", () => {
  const dir = project("It will not hold client funds.\n\nIt will not file taxes.");
  try {
    assert.deepEqual(productSection(dir, "Non-goals"),
      ["It will not hold client funds.", "It will not file taxes."]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bullets keep working exactly as they did", () => {
  const dir = project("- Not an ORM.\n- Not a CI system.");
  try {
    assert.deepEqual(productSection(dir, "Non-goals"), ["Not an ORM.", "Not a CI system."]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the template's own comment is never read as a declared non-goal", () => {
  const dir = project(); // untouched scaffold: the section holds only its comment
  try {
    assert.deepEqual(productSection(dir, "Non-goals"), []);
    assert.doesNotMatch(run(dir, ["prime", "--rules"]).stdout, /Explicit things/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an empty section is told to be filled, not to be created", () => {
  const dir = project();
  try {
    assert.equal(hasProductSection(dir, "Non-goals"), true);
    const out = run(dir, ["prime", "--rules"]).stdout;
    assert.match(out, /section of product\.md is empty/, out);
    assert.doesNotMatch(out, /add a `## Non-goals` section/,
      "rule C2: the remedy must be the act that is actually missing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a genuinely missing section is still told to be created", () => {
  const dir = project();
  try {
    const p = path.join(dir, ".doctrina", "product.md");
    writeFileSync(p, readFileSync(p, "utf8").replace(/## Non-goals[\s\S]*?(?=\n## )/, ""));
    assert.equal(hasProductSection(dir, "Non-goals"), false);
    assert.match(run(dir, ["prime", "--rules"]).stdout, /add a `## Non-goals` section/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's own non-goals are unchanged by the widened reader", () => {
  const goals = productSection(repoRoot, "Non-goals");
  assert.equal(goals.length, 4, JSON.stringify(goals));
  for (const g of goals) assert.doesNotMatch(g, /^</, `no comment text leaked in: ${g}`);
});

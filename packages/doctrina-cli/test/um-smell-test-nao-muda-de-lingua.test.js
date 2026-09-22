// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE SAME SENTENCE, TRANSLATED, IS THE SAME SENTENCE.
//
// `clarify` carries one lexicon per language. The Portuguese one flagged
// the quality adjectives that name no threshold — "robusto", "escalável",
// "adequado" — and the English one had no counterpart at all. So a page and
// its translation came back with three smells on one side and none on the
// other, in a project that keeps every page in both languages and gates on
// this command.
//
// The categories have to match. The MEMBERS cannot, and should not: bare
// "TODO" is a marker in English and the ordinary pronoun in Portuguese, and
// "may" is EARS Optional grammar. Those divergences are deliberate and
// carry their reason in a comment beside them; this test pins the category
// coverage, which is the part that must not drift.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-lex-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  return dir;
}

function smells(dir, name, body) {
  writeFileSync(path.join(dir, name), body);
  const r = runCli(["clarify", name], dir);
  return (r.stdout.match(/^⚠ /gm) ?? []).map((_, i) =>
    (r.stdout.split("\n").filter((l) => l.startsWith("⚠ "))[i] ?? ""));
}

// The pair that exposed it: one claim, two languages.
test("a quality adjective with no threshold smells in both languages", () => {
  const dir = project();
  try {
    const en = smells(dir, "en.md",
      "# Nota\n\nThe system shall be robust, scalable and adequate for the load.\n");
    const pt = smells(dir, "pt.md",
      "# Nota\n\nO sistema deve ser robusto, escalável e adequado para a carga.\n");
    assert.equal(en.length, 3, `English found ${en.length}: ${en.join(" | ")}`);
    assert.equal(pt.length, 3, `Portuguese found ${pt.length}: ${pt.join(" | ")}`);
    for (const line of [...en, ...pt]) assert.match(line, /vague/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the quantifier pair still answers the same on both sides", () => {
  const dir = project();
  try {
    assert.equal(smells(dir, "en.md", "# N\n\nIt covers several files and some cases.\n").length, 2);
    assert.equal(smells(dir, "pt.md", "# N\n\nCobre vários arquivos e alguns casos.\n").length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Both lexicons must offer the same CATEGORIES. A rule present on one side
// and absent on the other is the shape of the defect, whatever its members.
test("both lexicons declare the same rule names", () => {
  const source = readFileSync(path.resolve(here, "..", "src", "commands", "clarify.js"), "utf8");
  const namesIn = (constName) => {
    const block = new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\n\\];`).exec(source)?.[1] ?? "";
    assert.ok(block, `precondition: ${constName} is a declared array`);
    return [...block.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]).sort();
  };
  assert.deepEqual(namesIn("RULES_EN"), namesIn("RULES_PT"),
    "a category on one side and not the other makes the verdict depend on the language");
});

// And the guard has to be able to fail: an adjective nobody put in either
// list is still allowed through, so this is coverage, not a blanket ban.
test("an adjective outside the declared set is not invented", () => {
  const dir = project();
  try {
    assert.equal(smells(dir, "en.md", "# N\n\nThe page is legible and dated.\n").length, 0);
    assert.equal(smells(dir, "pt.md", "# N\n\nA página é legível e datada.\n").length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

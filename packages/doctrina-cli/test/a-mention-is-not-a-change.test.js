// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { documentedSurfaceSignals } from "../src/lib/docs-impact.js";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// NAMING A COMMAND IS NOT CHANGING IT.
//
// The docs gate reads names out of the authored text, and a name is all it
// can see. "`coverage` no longer knows this test exists" describes an effect;
// a Scope boundaries line saying "does not touch `verify`" describes an
// absence; both read exactly like a change that alters the command. Three
// closes in one session were forced for that reason, and a gate that is
// routinely forced stops being a gate: the ledger fills with gaps that were
// never gaps, and a real one stops standing out.
//
// No smarter extraction settles it — the difference is semantic, and ADR 0005
// puts semantics outside a deterministic gate. So the author declares it, in
// the grammar the tree already uses for `Realizes: n/a — <why>`.

function proposal(body, { lane = "product" } = {}) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-mention-"));
  const dir = path.join(tmp, ".doctrina", "changes", "0001-a-change");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "proposal.md"), [
    "# Change 0001-a-change — a change",
    "",
    "- **Status:** proposed",
    `- **Lane:** ${lane}`,
    ...body,
    "",
  ].join("\n"));
  return { tmp, dir };
}

const MENTIONS = [
  "",
  "## Why",
  "",
  "The proof is orphaned: `doctrina coverage` does not know the test exists.",
  "",
  "## Scope boundaries",
  "",
  "Does not touch `doctrina verify`, which is correct as it stands.",
];

test("without a declaration, a mentioned command is still reported", () => {
  const { tmp, dir } = proposal(MENTIONS);
  try {
    const signals = documentedSurfaceSignals(dir, tmp);
    assert.ok(signals.some((s) => /coverage/.test(s)),
      `the gate must keep its default sensitivity; got ${JSON.stringify(signals)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a declared mention with a reason silences the gate", () => {
  const { tmp, dir } = proposal([
    "- **Documented surface:** n/a — names two commands to explain an effect; alters neither",
    ...MENTIONS,
  ]);
  try {
    assert.deepEqual(documentedSurfaceSignals(dir, tmp), [],
      "a declared, explained non-change must not be reported as a change");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("\"none\" reads the same as \"n/a\"", () => {
  const { tmp, dir } = proposal([
    "- **Documented surface:** none — only spec metadata moves",
    ...MENTIONS,
  ]);
  try {
    assert.deepEqual(documentedSurfaceSignals(dir, tmp), []);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// The two-axis rule, borrowed from `Realizes:` and from the deferral escape
// hatch `coverage` already honours: a bare word is an assertion nobody wrote.
// Without this, the header becomes a switch that turns the gate off, which is
// worse than the false positives it exists to answer.
test("a bare n/a is not a declaration and does not silence anything", () => {
  for (const bare of ["n/a", "none", "n/a —", "  none  "]) {
    const { tmp, dir } = proposal([`- **Documented surface:** ${bare}`, ...MENTIONS]);
    try {
      const signals = documentedSurfaceSignals(dir, tmp);
      assert.ok(signals.length > 0,
        `"${bare}" carries no reason, so it must not silence the gate`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
});

test("a declaration cannot hide a surface the change really alters", () => {
  // The header is a statement about THIS change, and it is auditable: it sits
  // in the proposal, in the diff, and in review. It is not a way to smuggle a
  // renamed flag past the gate — it is a way to say, on the record, that the
  // names in the prose are context. The check that it carries a reason is what
  // keeps the two apart.
  const { tmp, dir } = proposal([
    "- **Documented surface:** n/a",
    "",
    "## What",
    "",
    "`doctrina validate` gains a `--strict` flag.",
  ]);
  try {
    const signals = documentedSurfaceSignals(dir, tmp);
    assert.ok(signals.length > 0, "an undeclared reason leaves the gate exactly as sensitive");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// A DECLARATION NOBODY WROTE IS NOT A DECLARATION.
//
// An HTML comment is annotation — the rule this module applies everywhere
// else, and the one the header shipped without. The proposal template now
// carries a commented EXAMPLE of the declaration, right where an author
// hitting the gate would look for it; read from raw text, that example
// silenced the gate for every change scaffolded from the template.
//
// Same principle as the bare `n/a`: the reason has to be written, by a person,
// outside a comment.
test("the declaration is ignored inside an HTML comment", () => {
  const { tmp, dir } = proposal([
    "",
    "<!--",
    "When the names below are only mentioned, say so:",
    "- **Documented surface:** n/a — names a command to explain an effect",
    "-->",
    "",
    "## What",
    "",
    "`doctrina validate` gains a `--strict` flag.",
  ]);
  try {
    const signals = documentedSurfaceSignals(dir, tmp);
    assert.ok(signals.length > 0,
      `an example in a comment must not silence the gate; got ${JSON.stringify(signals)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// And the template that ships this example must prove it on itself: a change
// scaffolded from it, with a real surface change written in, is still caught.
test("a change scaffolded from the shipped template is still gated", () => {
  const templatePath = path.resolve(here, "..", "..", "..",
    ".doctrina", "templates", "change", "proposal.md.template");
  const template = readFileSync(templatePath, "utf8");
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-tpl-"));
  try {
    const dir = path.join(tmp, ".doctrina", "changes", "0001-a-change");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "proposal.md"), template
      .replace("{{CHANGE_ID}}", "0001-a-change")
      .replace("{{CHANGE_TITLE}}", "a change")
      .replace("{{DATE}}", "2026-09-11")
      .replace("- **Lane:**", "- **Lane:** product")
      .replace("<!-- The user-visible or technical reason this change exists. -->",
        "`doctrina validate` gains a `--strict` flag."));
    const signals = documentedSurfaceSignals(dir, tmp);
    assert.ok(signals.length > 0,
      `the template's own example must not disarm the gate; got ${JSON.stringify(signals)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

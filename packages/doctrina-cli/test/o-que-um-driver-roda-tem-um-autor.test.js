// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequence } from "../src/lib/gates.js";

// WHAT A DRIVER RUNS IS DECLARED ONCE AND RESTATED EVERYWHERE.
//
// Change 0150 held the CLOSE sequence to its declaration after four copies
// of it had drifted to four different lists. The same shape kept happening
// one driver over:
//
//   - eleven passages said the pre-commit hook runs `validate --fix`. Since
//     change 0156 it runs that AND `index rebuild --check --staged` — and
//     the docs gate was satisfied by the unrelated docs edit that shipped
//     with it, because it asks whether docs moved, not whether the right
//     page did.
//   - the `system` contract's Interfaces section named five of the
//     composite action's six steps, dropping the context budget gate. That
//     section exists so an external consumer knows what it integrates
//     against.
//
// Both are enumerations of what a driver runs, and both have a declaration
// to be held to: the hook template, and SEQUENCES.ci.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const read = (...p) => readFileSync(path.join(repoRoot, ...p), "utf8");

// ------------------------------------------------------- the pre-commit hook

// The INVOCATIONS the shipped hook makes, whole: `$DOCTRINA validate --fix`
// -> "validate --fix". The whole invocation, not the bare command name —
// "validate" alone appears in half the documentation for unrelated reasons,
// and a check that fires on it reports every page as a claim about the hook.
function hookSteps() {
  const tpl = read(".doctrina", "templates", "hooks", "pre-commit.sample");
  const steps = [];
  for (const m of tpl.matchAll(/^\$DOCTRINA\s+([^\n|&]+?)\s*(?:\|\||&&|$)/gm)) {
    steps.push(m[1].trim());
  }
  return [...new Set(steps)];
}

// Passages that tell the reader what the hook runs: they mention the hook
// AND spell out at least one of its invocations. A page that merely says
// "install the hook" is making no claim about its contents.
function hookClaims() {
  const out = [];
  const steps = hookSteps();
  for (const dir of ["docs/en", "docs/pt"]) {
    for (const f of readdirSync(path.join(repoRoot, dir))) {
      if (!f.endsWith(".md")) continue;
      const rel = path.join(dir, f);
      for (const block of read(rel).split(/\r?\n\s*\r?\n/)) {
        const flat = block.replace(/[`*]/g, "").replace(/\s+/g, " ");
        if (!/hooks install|pre-commit/i.test(flat)) continue;
        if (!steps.some((s) => flat.includes(s))) continue;
        out.push({ rel, flat });
      }
    }
  }
  return out;
}

test("the hook template is read, not assumed", () => {
  const steps = hookSteps();
  assert.ok(steps.length >= 2,
    `expected the hook to invoke more than one command; parsed ${JSON.stringify(steps)}`);
  assert.ok(steps.some((s) => s.startsWith("validate ")), `parsed ${JSON.stringify(steps)}`);
});

test("every passage that says what the hook runs names all of it", () => {
  const steps = hookSteps();
  const claims = hookClaims();
  assert.ok(claims.length >= 4, `expected the docs to describe the hook; found ${claims.length}`);
  const wrong = [];
  for (const { rel, flat } of claims) {
    const missing = steps.filter((s) => !flat.includes(s));
    if (missing.length > 0) wrong.push(`${rel}: missing ${missing.join(", ")} — ${flat.slice(0, 90)}`);
  }
  assert.deepEqual(wrong, [],
    "a passage that abridges the hook teaches a commit gate that is not the one installed");
});

// ------------------------------------------------------ the composite action

test("the contract's action list is the declared CI sequence", () => {
  const contract = read(".doctrina", "contracts", "system.md").replace(/\s+/g, " ");
  // The whole bullet, to the next one or the next heading. Stopping at the
  // first period stops inside `action.yml`.
  const entry = /\*\*The composite action\*\*[\s\S]*?(?= - \*\*| ## |$)/.exec(contract)?.[0] ?? "";
  assert.ok(entry.length > 60, `precondition: the contract describes the action; read: ${entry}`);

  // Step id -> the name the prose uses for it.
  const NAMED = {
    "validate": "validate",
    "index-drift": "index rebuild",
    "contract-check": "contract check",
    "coverage": "coverage",
    "trace": "trace",
    "context-budget": "context",
  };
  const missing = sequence("ci")
    .map((s) => s.id)
    .filter((id) => !entry.includes(NAMED[id] ?? id));
  assert.deepEqual(missing, [],
    `the Interfaces section is what an external consumer integrates against; `
    + `it named: ${entry}`);
});

// The guards have to be able to fail.
test("an abridged claim is detected", () => {
  const steps = hookSteps();
  const flat = "the pre-commit hook runs validate --fix on every commit";
  assert.ok(steps.filter((s) => !flat.includes(s)).length > 0,
    `the sentence that shipped for eleven passages must read as short; steps: ${JSON.stringify(steps)}`);

  const entry = "runs `validate`, `index rebuild --check`, `contract check`, `coverage` and `trace`.";
  assert.ok(!entry.includes("context"), "the list that dropped the budget gate must read as short");
});

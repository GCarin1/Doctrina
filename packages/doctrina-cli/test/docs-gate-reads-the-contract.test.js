import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { documentedSurfaceSignals, declaredSurfaceNames, documentationHomes, docsRemedy }
  from "../src/lib/docs-impact.js";

// Change 0063 — the docs gate reads the project's own contract.
//
// The gate is blocking in `close` and exists for one thing: a change that
// alters documented surface only closes with the documentation for it. It
// recognised a command by comparing against `COMMAND_NAMES` — DOCTRINA's
// catalog — so outside this repository almost nothing was surface. Measured
// against an adopting project, four of five surface changes produced zero
// signals: a new CLI command, a public HTTP endpoint, a renamed environment
// variable, a changed config key. Each closed with no documentation and no
// complaint, while inside this repository the same gate fired on everything.
//
// The vocabulary was already in the right place. A contract declares Ports,
// Environment, Wiring, Selectors and Interfaces — the surface a project states
// for itself, the same principle ADR 0023 set for the runtime.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");

function project({ contract = true } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-docsgate-"));
  mkdirSync(path.join(root, ".doctrina", "contracts"), { recursive: true });
  if (contract) {
    writeFileSync(path.join(root, ".doctrina", "contracts", "system.md"), [
      "# Contract — system", "", "**Status:** active", "",
      "## Ports", "",
      "| Service  | Port | Protocol |", "|---|---|---|", "| ledgerly | 8080 | http |", "",
      "## Environment", "",
      "| Variable          | Required | Values | Example |", "|---|---|---|---|",
      "| LEDGERLY_SMTP_URL | yes      | —      | smtp://x |",
      "| chase_after_days  | no       | —      | 14 |", "",
      "## Interfaces", "",
      "- `ledgerly reconcile` — reruns matching for a period.",
      "- `POST /api/invoices` — issues an invoice.", "",
    ].join("\n"));
  }
  return root;
}

function change(root, why) {
  const dir = path.join(root, "changes", Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "proposal.md"),
    `# Change 0003-x — x\n\n- **Status:** proposed\n\n## Why\n\n${why}\n`);
  return dir;
}

// ---------------------------------------- the five cases the audit measured

test("an adopting project's declared surface is recognised", () => {
  const root = project();
  try {
    const cases = {
      "a command the contract declares": "The `ledgerly reconcile` command now rebuilds its index first.",
      "an env var the contract declares": "Rename `LEDGERLY_SMTP_URL` to `LEDGERLY_MAIL_URL`.",
      "a config key the contract declares": "The `chase_after_days` setting moves from days to hours.",
    };
    for (const [name, why] of Object.entries(cases)) {
      const signals = documentedSurfaceSignals(change(root, why), root);
      assert.ok(signals.some((s) => s.startsWith("declared surface:")),
        `${name} produced no declared-surface signal: ${JSON.stringify(signals)}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("surface a change is ADDING is recognised by shape, not by the contract", () => {
  // The declared-name match cannot reach this case: an endpoint being added is
  // by definition not in the contract yet.
  const root = project({ contract: false });
  try {
    const endpoint = documentedSurfaceSignals(
      change(root, "Add `POST /api/invoices/:id/receipt` to the public API."), root);
    assert.ok(endpoint.some((s) => s.startsWith("endpoints:")), JSON.stringify(endpoint));

    const env = documentedSurfaceSignals(
      change(root, "Introduce `LEDGERLY_MAIL_URL` for the outbound queue."), root);
    assert.ok(env.some((s) => s.startsWith("environment:")), JSON.stringify(env));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a purely internal change is still silent", () => {
  const root = project();
  try {
    const signals = documentedSurfaceSignals(
      change(root, "Extract the matcher into its own module; no behaviour changes."), root);
    assert.deepEqual(signals, [],
      `a gate that fires on everything is a gate that gets ignored: ${JSON.stringify(signals)}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a project with no contract behaves exactly as it did before", () => {
  const root = project({ contract: false });
  try {
    assert.deepEqual(declaredSurfaceNames(root), []);
    // The Doctrina catalog remains the last resort, unchanged.
    const signals = documentedSurfaceSignals(
      change(root, "`doctrina close` gains a `--pdf` flag."), root);
    assert.ok(signals.includes("commands: close"), JSON.stringify(signals));
    assert.ok(signals.some((s) => s.includes("--pdf")), JSON.stringify(signals));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the most specific declaration is the one reported", () => {
  const root = project();
  try {
    const signals = documentedSurfaceSignals(
      change(root, "The `ledgerly reconcile` command gains a period argument."), root);
    const declared = signals.find((s) => s.startsWith("declared surface:"));
    assert.match(declared, /ledgerly reconcile/);
    assert.doesNotMatch(declared, /surface: ledgerly(,|$)/,
      "the bare service name adds nothing next to the command that starts with it");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("this repository's own contract is read", () => {
  const declared = declaredSurfaceNames(repoRoot);
  assert.ok(declared.includes("agents-md-lines"), JSON.stringify(declared));
  assert.ok(declared.includes("--json"), JSON.stringify(declared));
});

// --------------------------------------------------- the remedy, still portable

test("only a directory that holds prose is offered as a place to write prose", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-homes-"));
  try {
    mkdirSync(path.join(root, "docs", "guide"), { recursive: true });
    mkdirSync(path.join(root, "docs", "assets"), { recursive: true });
    writeFileSync(path.join(root, "docs", "guide", "cli.md"), "# CLI\n");
    writeFileSync(path.join(root, "docs", "assets", "logo.svg"), "<svg/>\n");

    const homes = documentationHomes(root);
    assert.ok(homes.includes("docs/guide/"), JSON.stringify(homes));
    assert.ok(!homes.includes("docs/assets/"),
      `an SVG directory is not somewhere to write documentation: ${JSON.stringify(homes)}`);
    assert.doesNotMatch(docsRemedy(root), /assets/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("this repository's remedy names both languages and nothing else", () => {
  const homes = documentationHomes(repoRoot);
  assert.deepEqual(homes.filter((h) => h.startsWith("docs/")), ["docs/en/", "docs/pt/"],
    JSON.stringify(homes));
});

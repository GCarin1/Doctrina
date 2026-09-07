import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { expandMarkup, renderPlaybook, PLAYBOOKS } from "../src/lib/playbook.js";

// Change 0038 — playbooks are templates.
//
// `printPlaybook()` was ~100 lines of literal console.log, and the same
// procedure was written out again in AGENTS.md and twice in the workflow
// docs. Four homes for one fact, in the framework whose first principle is
// that a fact has one — and no way for an adopting team to say "our close
// has an extra review step".
//
// The migration has to be FAITHFUL: the golden files under
// test/fixtures/playbooks/ were captured from the previous implementation,
// before a line of it moved, and every variant is asserted byte for byte
// against them. A migration that quietly reworded the procedure would be a
// different change wearing this one's name.
//
// Two things in them have moved since, and both are BEHAVIOUR the goldens
// happen to capture rather than playbook prose they were written to pin:
//   - change 0040 unified the capability ranker with `context`'s, so the
//     `score` column reports the shared lexicon's value;
//   - change 0044 scaffolds the delta from a confident ranked winner too, so
//     `work.txt` gains the `created ...delta.md` line and step 3 renders its
//     already-scaffolded branch.
// The goldens were re-captured for each, and every line around the change is
// still the original.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const golden = (name) => readFileSync(path.join(here, "fixtures", "playbooks", `${name}.txt`), "utf8");

function runCli(args, cwd, env = {}) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", ...env },
  });
}

// The exact fixture the goldens were captured in: a fresh project with one
// spec, so the capability ranking has something to rank.
function project({ withSpec = true } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-playbook-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  if (withSpec) assert.equal(runCli(["spec", "new", "billing"], dir).status, 0);
  return dir;
}

// ------------------------------------------------------------- the markup

test("colour markup expands, nests, and leaves unmarked text alone", () => {
  // NO_COLOR is set for the suite, so the marks render as plain text — which
  // is exactly the property worth pinning: the markup never leaks into the
  // output, coloured or not.
  assert.equal(expandMarkup("[[c]]doctrina close[[/c]]"), "doctrina close");
  assert.equal(expandMarkup("[[g]]a [[c]]b[[/c]] c[[/g]]"), "a b c");
  assert.equal(expandMarkup("plain text"), "plain text");
  assert.doesNotMatch(expandMarkup("[[b]]x[[/b]] [[y]]y[[/y]]"), /\[\[/);
});

test("a token's value cannot inject colour markup into the playbook", () => {
  // Markup is expanded BEFORE substitution, so a prompt carrying `[[c]]`
  // lands as literal text. A user's words must never be able to restyle the
  // procedure the agent is about to follow.
  const dir = project();
  try {
    const r = runCli(["work", "add [[c]]sneaky[[/c]] export", "--id", "0001-x"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Prompt: "add \[\[c\]\]sneaky\[\[\/c\]\] export"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------- the fidelity

test("the work playbook is byte-identical to the pre-migration output", () => {
  const dir = project();
  try {
    const r = runCli(["work", "add a billing invoice export"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, golden("work"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the chore playbook is byte-identical to the pre-migration output", () => {
  const dir = project();
  try {
    const r = runCli(["work", "--chore", "tidy the CI matrix", "--id", "0002-chore"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, golden("chore"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the pinned-capability and thin-prompt variants are byte-identical too", () => {
  // The two branches that were `if` statements in the old printer, and are
  // pre-rendered tokens now. They are where a faithful migration is most
  // likely to drift — a lost blank line, a dropped warning.
  const dir = project();
  try {
    const pinned = runCli(["work", "--capability", "billing", "pin the billing capability", "--id", "0003-pinned"], dir);
    assert.equal(pinned.status, 0, pinned.stderr);
    assert.equal(pinned.stdout, golden("pinned"));

    const thin = runCli(["work", "fix", "--id", "0005-thin"], dir);
    assert.equal(thin.status, 0, thin.stderr);
    assert.equal(thin.stdout, golden("thin"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the bootstrap playbook is byte-identical to the pre-migration output", () => {
  const dir = project({ withSpec: false });
  try {
    const r = runCli(["intake", "--text",
      "A billing system for small shops. Users create invoices, send them by email, and track payment. Success is an invoice sent in under a minute."], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, golden("bootstrap"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("colour survives the move: the ANSI rendering is byte-identical", () => {
  // The migration is only faithful if it kept the colours, and colour is the
  // part a template most easily loses. Captured with FORCE_COLOR from the old
  // implementation, escape codes and all.
  const dir = project();
  try {
    assert.equal(runCli(["work", "add a billing invoice export"], dir).status, 0);
    const r = runCli(["work", "x", "--resume", "0001-add-a-billing-invoice-export"], dir,
      { NO_COLOR: undefined, FORCE_COLOR: "1" });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, golden("work-ansi"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------- the override

test("a project playbook overrides the bundled one, per file", () => {
  // The point of the change: a team whose process differs can say so. Per
  // FILE, like every other template (ADR 0019) — overriding `work` must not
  // drag `chore` and `bootstrap` into the project's tree with it.
  const dir = project();
  try {
    mkdirSync(path.join(dir, ".doctrina", "templates", "playbooks"), { recursive: true });
    writeFileSync(path.join(dir, ".doctrina", "templates", "playbooks", "work.md.template"),
      "OUR PLAYBOOK — change {{CHANGE_ID}}\n\n1. Ask the [[c]]architecture guild[[/c]] first.\n");

    const overridden = runCli(["work", "add a billing invoice export", "--id", "0001-x"], dir);
    assert.equal(overridden.status, 0, overridden.stderr);
    assert.match(overridden.stdout, /OUR PLAYBOOK — change 0001-x/);
    assert.match(overridden.stdout, /Ask the architecture guild first\./);
    assert.doesNotMatch(overridden.stdout, /Read the context pack/, "the bundled work playbook must not also print");

    // chore was not overridden, so it still renders the bundled text.
    const chore = runCli(["work", "--chore", "tidy CI", "--id", "0002-c"], dir);
    assert.equal(chore.status, 0, chore.stderr);
    assert.match(chore.stdout, /Chore playbook — change 0002-c/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a line holding only an empty token is removed, not left blank", () => {
  // The rule that lets the optional blocks be plain tokens instead of
  // conditionals in a template language. Without it every absent block would
  // leave a stray blank line, and the byte-identity above would be
  // unachievable.
  const dir = project();
  try {
    mkdirSync(path.join(dir, ".doctrina", "templates", "playbooks"), { recursive: true });
    writeFileSync(path.join(dir, ".doctrina", "templates", "playbooks", "work.md.template"),
      "top\n{{ABSENT}}\n{{PRESENT}}\nbottom\n");
    assert.equal(renderPlaybook(dir, "work", { ABSENT: "", PRESENT: "middle" }), "top\nmiddle\nbottom");
    assert.equal(renderPlaybook(dir, "work", {}), "top\nbottom");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -------------------------------------------------------- templates check

test("templates check reports a missing or malformed playbook", () => {
  const dir = project();
  try {
    const clean = runCli(["templates", "check"], dir);
    assert.equal(clean.status, 0, clean.stdout);
    for (const name of PLAYBOOKS) assert.match(clean.stdout, new RegExp(`playbook: ${name}`));

    // A project override that is empty, and one with an unbalanced span.
    const dest = path.join(dir, ".doctrina", "templates", "playbooks");
    mkdirSync(dest, { recursive: true });
    writeFileSync(path.join(dest, "work.md.template"), "");
    writeFileSync(path.join(dest, "chore.md.template"), "1. do it with [[c]]a command\n");

    const broken = runCli(["templates", "check"], dir);
    assert.equal(broken.status, 1, broken.stdout);
    assert.match(broken.stdout, /playbook "work" is malformed: it is empty/);
    assert.match(broken.stdout, /playbook "chore" is malformed: 1 \[\[c\]\] spans but 0 \[\[\/c\]\]/);
    assert.match(broken.stdout, /delete it to fall back to the bundled playbook/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

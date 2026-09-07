import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { rankCapabilities } from "../src/lib/work-model.js";
import { CONFIDENT_MARGIN } from "../src/lib/lexicon.js";

// Change 0044 — the delta is always scaffolded.
//
// `work` prefilled `**Operation:**` only under --capability, so on the
// default path the agent still hand-wrote the one file whose missing header
// exploded days later at analyze. The fix is to scaffold from the ranking
// too — but only when the winner actually leads, and only marked as a guess.
// What these pin is the trade: a wrong file the agent can see and correct
// beats an absent file nothing reports, and a coin toss is neither.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function spec(dir, cap, purpose) {
  mkdirSync(path.join(dir, ".doctrina", "specs", cap), { recursive: true });
  writeFileSync(path.join(dir, ".doctrina", "specs", cap, "spec.md"),
    `# Spec — ${cap}\n\n**Capability:** ${cap}\n**Status:** active\n` +
    `**Implementation:** planned\n**Realizes:** n/a — test\n**Version:** 0.1.0\n\n` +
    `## Purpose\n\n${purpose}\n`);
}

// Two capabilities whose Purpose lines share no words, so a prompt can be
// aimed at exactly one of them, or at one word of each.
function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-guess-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  spec(dir, "billing", "Invoices, invoice export, and billing statements for customers.");
  spec(dir, "auth", "Login sessions and password reset.");
  assert.equal(runCli(["index", "rebuild"], dir).status, 0);
  return dir;
}

const deltaOf = (dir, id, cap) =>
  path.join(dir, ".doctrina", "changes", id, "specs", cap, "delta.md");

test("a confident ranked winner opens the change with its delta already written", () => {
  const dir = project();
  try {
    const r = runCli(["work", "add an invoice export for customers", "--id", "0001-x"], dir);
    assert.equal(r.status, 0, r.stderr);
    const delta = deltaOf(dir, "0001-x", "billing");
    assert.ok(existsSync(delta), "the winning capability's delta must be scaffolded");
    const text = readFileSync(delta, "utf8");
    // The header the whole change exists for.
    assert.match(text, /^\*\*Operation:\*\* MODIFIED$/m);
    assert.match(text, /^# Spec Delta — capability: billing$/m);
    // And it says it is a guess, with the evidence and the correction.
    assert.match(text, /RANKED GUESS/);
    assert.match(text, /rm -r \.doctrina\/changes\/0001-x\/specs\/billing/);
    assert.match(r.stdout, /ranked guess, correct it if wrong/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a guessed delta can only ever be MODIFIED", () => {
  // The ranker scores specs that exist, so it cannot name one that does not.
  // ADDED from a guess would mean scaffolding a capability nobody asked for.
  const dir = project();
  try {
    assert.equal(runCli(["work", "add an invoice export for customers", "--id", "0001-x"], dir).status, 0);
    assert.doesNotMatch(readFileSync(deltaOf(dir, "0001-x", "billing"), "utf8"),
      /^\*\*Operation:\*\* ADDED$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("without a margin nothing is scaffolded, and the playbook says to write it", () => {
  // "invoice" hits billing, "login" hits auth: one body term each, so the
  // only thing separating them is length. A guess here would be a coin toss
  // placed in a folder, which is worse than no file at all.
  const dir = project();
  try {
    const r = runCli(["work", "the invoice login problem", "--id", "0002-x"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!existsSync(deltaOf(dir, "0002-x", "billing")), "a coin toss must not be scaffolded");
    assert.ok(!existsSync(deltaOf(dir, "0002-x", "auth")));
    assert.match(r.stdout, /3\. Write one delta per affected capability at/);
    // The ranking is still SHOWN — it was always a hint (ADR 0005); what the
    // margin decides is whether the CLI may act on it.
    assert.match(r.stdout, /Likely capabilities/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--chore and --from-diff scaffold no delta", () => {
  const dir = project();
  try {
    const chore = runCli(["work", "--chore", "add an invoice export for customers", "--id", "0003-c"], dir);
    assert.equal(chore.status, 0, chore.stderr);
    assert.ok(!existsSync(deltaOf(dir, "0003-c", "billing")), "a chore is spec-less by definition");

    // --from-diff ranks by changed files, on a different scale with no
    // density term, and a backfill normally touches several capabilities at
    // once — one scaffolded winner would be the wrong shape.
    const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(git("init", "-q").status, 0);
    git("config", "user.email", "t@example.com");
    git("config", "user.name", "t");
    assert.equal(git("add", "-A").status, 0);
    assert.equal(git("commit", "-qm", "base").status, 0);
    mkdirSync(path.join(dir, "src", "billing"), { recursive: true });
    writeFileSync(path.join(dir, "src", "billing", "export.js"), "// invoice export\n");
    const diff = runCli(["work", "--from-diff", "--id", "0004-d"], dir);
    assert.equal(diff.status, 0, diff.stderr);
    assert.ok(!existsSync(deltaOf(dir, "0004-d", "billing")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a pinned capability still scaffolds, and is never marked a guess", () => {
  const dir = project();
  try {
    const r = runCli(["work", "--capability", "auth", "something vague", "--id", "0005-p"], dir);
    assert.equal(r.status, 0, r.stderr);
    const text = readFileSync(deltaOf(dir, "0005-p", "auth"), "utf8");
    assert.match(text, /^\*\*Operation:\*\* MODIFIED$/m);
    assert.doesNotMatch(text, /RANKED GUESS/, "the operator pinned it — that is not a guess");
    assert.doesNotMatch(r.stdout, /ranked guess/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--resume repeats the guess warning, reading it back from the file", () => {
  // --resume creates nothing and re-ranks from the recorded title, so it
  // cannot know how the delta got there. The mark in the file is how a later
  // session learns the capability was ranked rather than chosen.
  const dir = project();
  try {
    assert.equal(runCli(["work", "add an invoice export for customers", "--id", "0001-x"], dir).status, 0);
    const resumed = runCli(["work", "--resume", "0001-x"], dir);
    assert.equal(resumed.status, 0, resumed.stderr);
    assert.match(resumed.stdout, /A delta is already scaffolded/);
    assert.match(resumed.stdout, /It was RANKED, not pinned/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the ranking exposes the margin over the runner-up", () => {
  const dir = project();
  try {
    const ranked = rankCapabilities(dir, "add an invoice export for customers");
    assert.equal(ranked[0].id, "billing");
    assert.equal(ranked[0].margin, ranked[0].score - (ranked[1]?.score ?? 0));
    // The last capability's runner-up is 0 — `triage`'s convention for a lane
    // nothing scored against.
    assert.equal(ranked.at(-1).margin, ranked.at(-1).score);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the margin is one density can never produce, at any spec length", () => {
  // The calibration, stated as the property rather than the number: two specs
  // that matched the SAME single term differ only by the density tie-breaker,
  // which is capped so it can only break ties. Pad one of them to any length
  // and it must still never clear the margin.
  for (const padding of [0, 200, 2000, 20000]) {
    const dir = project();
    try {
      spec(dir, "billing", `Invoices and export.${" filler".repeat(padding / 7 | 0)}`);
      spec(dir, "auth", "Invoices and login.");
      const ranked = rankCapabilities(dir, "the invoices question");
      assert.equal(ranked.length, 2, `padding ${padding}: both specs must match`);
      assert.ok(ranked[0].margin < CONFIDENT_MARGIN,
        `padding ${padding}: a density-only lead (${ranked[0].margin}) must not read as confident`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

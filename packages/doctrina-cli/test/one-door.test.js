import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { changedFiles, GIT_STATE } from "../src/lib/git.js";
import { terms, relevance, score, fold, STOPWORDS, FIX_SHAPED } from "../src/lib/lexicon.js";
import { rankCapabilities } from "../src/commands/work.js";

// Change 0040 — one door to git, one lexicon.
//
// Two abstractions had been built and then not adopted. `lib/git.js` was
// written to be the single door and two modules used it, while four carried
// their own "which files changed" — each reading a non-zero exit as an empty
// list rather than a refusal. And `work` ranked a prompt against the spec
// tree with one stop list while `context --for` used another, in a flow whose
// own playbook runs them back to back.
//
// These tests pin the adoption, not just today's behaviour: a fifth private
// git call or a second stop list fails the suite.

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(here, "..", "src");
const cliEntry = path.join(srcDir, "index.js");

function allSources() {
  const out = [];
  for (const dir of ["lib", "commands"]) {
    for (const f of readdirSync(path.join(srcDir, dir))) {
      if (f.endsWith(".js")) out.push([path.posix.join(dir, f), readFileSync(path.join(srcDir, dir, f), "utf8")]);
    }
  }
  return out;
}

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function repo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-door-"));
  spawnSync("git", ["init", "-q", "."], { cwd: dir });
  return dir;
}

// -------------------------------------------------------------- one door

test("no module outside lib/git.js spawns git", () => {
  const offenders = allSources()
    .filter(([rel]) => rel !== "lib/git.js")
    .filter(([, text]) => /spawnSync\(\s*["'`]git["'`]/.test(text) || /execFileSync\(\s*["'`]git["'`]/.test(text))
    .map(([rel]) => rel);
  assert.deepEqual(offenders, [],
    "git goes through lib/git.js — a private call reads a refusal as an empty answer:\n" + offenders.join("\n"));
});

test("changedFiles distinguishes 'nothing changed' from 'could not answer'", () => {
  // The mistake the door exists to prevent: four callers folded a non-zero
  // exit into an empty list, so "not a repository" and "clean tree" looked
  // identical to every one of them.
  const notARepo = mkdtempSync(path.join(os.tmpdir(), "doctrina-norepo-"));
  try {
    const outside = changedFiles(notARepo);
    assert.equal(outside.ok, false, "outside a repository the door must not claim a clean tree");
    assert.deepEqual(outside.files, []);
    assert.notEqual(outside.state, GIT_STATE.OK);
  } finally {
    rmSync(notARepo, { recursive: true, force: true });
  }

  const dir = repo();
  try {
    writeFileSync(path.join(dir, "a.txt"), "one\n");
    spawnSync("git", ["add", "-A"], { cwd: dir });
    spawnSync("git", ["-c", "user.email=a@b", "-c", "user.name=t", "commit", "-qm", "init"], { cwd: dir });

    const clean = changedFiles(dir);
    assert.equal(clean.ok, true, "a clean tree is an ANSWER, not a failure");
    assert.deepEqual(clean.files, []);

    writeFileSync(path.join(dir, "a.txt"), "two\n");
    writeFileSync(path.join(dir, "b.txt"), "new\n");
    assert.deepEqual(changedFiles(dir).files, ["a.txt", "b.txt"]);
    assert.deepEqual(changedFiles(dir, { untracked: false }).files, ["a.txt"],
      "untracked files are opt-out, for the callers that compare against a ref");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the merge-base option is what makes a branch's earlier commits count", () => {
  // The one semantic that genuinely differs between callers, so it is an
  // OPTION rather than a fifth implementation: the docs gate asks "did docs
  // ship with this work", not "did docs change since the last commit".
  const dir = repo();
  try {
    const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
    writeFileSync(path.join(dir, "base.txt"), "base\n");
    git("add", "-A");
    git("-c", "user.email=a@b", "-c", "user.name=t", "commit", "-qm", "base");
    git("branch", "-M", "main");
    git("checkout", "-qb", "feature");
    writeFileSync(path.join(dir, "docs.md"), "documented\n");
    git("add", "-A");
    git("-c", "user.email=a@b", "-c", "user.name=t", "commit", "-qm", "docs");

    assert.deepEqual(changedFiles(dir).files, [], "the commit is behind HEAD, so a plain diff sees nothing");
    assert.deepEqual(changedFiles(dir, { mergeBase: true }).files, ["docs.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------ one lexicon

test("no module outside lib/lexicon.js carries its own stop list or fix pattern", () => {
  const offenders = allSources()
    .filter(([rel]) => rel !== "lib/lexicon.js")
    .filter(([, text]) => /^const\s+\w*(STOPWORDS|FIX_SHAPED)\w*\s*=/m.test(text))
    .map(([rel]) => rel);
  assert.deepEqual(offenders, [],
    "the vocabulary lives in lib/lexicon.js — a second copy drifts silently:\n" + offenders.join("\n"));
});

test("the lexicon folds accents, so a Portuguese prompt matches an ASCII spec", () => {
  assert.equal(fold("Função"), "funcao");
  assert.ok(terms("a função de importação").includes("funcao"));
  assert.ok(!terms("the system shall add a new feature").length,
    "a prompt of pure connective tissue yields no content words");
});

test("stop words are dropped in both languages, and real terms survive", () => {
  const t = terms("adicionar exportação de invoice no billing");
  assert.ok(t.includes("exportacao") && t.includes("invoice") && t.includes("billing"));
  assert.ok(!t.includes("adicionar") && !t.includes("no"));
  // Short domain terms are real terms, not noise.
  assert.ok(terms("emit the ci pipeline").includes("ci"));
  assert.ok(STOPWORDS.has("the") && STOPWORDS.has("para"));
});

test("relevance is a tuple and the score is its projection, not a second sum", () => {
  // The property that keeps two surfaces from disagreeing: one calculation,
  // two renderings — the same shape ADR 0025 records for the views.
  const text = "billing invoices and billing exports";
  const q = terms("billing export");
  const [inTitle, inBody, density] = relevance(text, q, "billing");
  assert.equal(inTitle, 1);
  assert.equal(inBody, 2);
  assert.ok(density > 0);
  assert.equal(score(text, q, "billing"), inTitle * 100 + inBody * 10 + Math.min(density, 9));
  // Ordering agrees between the two renderings.
  const other = "unrelated prose with no matches at all";
  assert.ok(score(text, q, "billing") > score(other, q, ""));
});

test("density, not raw hits, breaks the tie — so length does not win", () => {
  const q = terms("skill");
  const short = "writing a skill";
  const long = "skill " + "filler ".repeat(400);
  assert.ok(relevance(short, q)[2] > relevance(long, q)[2],
    "a long document must not out-rank a focused one on volume");
});

test("`work` and `context --for` agree on the most relevant capability", () => {
  // The defect in one sentence: the work playbook tells the agent to run
  // `context` immediately after `work`, and the two ranked the same prompt
  // with different vocabularies.
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-agree-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    for (const [cap, body] of [
      ["billing", "Invoices, exports and payment tracking for a shop."],
      ["auth", "Sessions, passwords and login for a user."],
    ]) {
      mkdirSync(path.join(dir, ".doctrina", "specs", cap), { recursive: true });
      writeFileSync(path.join(dir, ".doctrina", "specs", cap, "spec.md"),
        `# Spec — ${cap}\n\n**Capability:** ${cap}\n**Status:** active\n**Implementation:** planned\n` +
        `**Realizes:** n/a — internal\n**Version:** 0.1.0\n\n## Purpose\n\n${body}\n`);
    }
    runCli(["index", "rebuild"], dir);

    for (const [prompt, expected] of [
      ["add an invoice export", "billing"],
      ["fix the login session", "auth"],
    ]) {
      const ranked = rankCapabilities(dir, prompt);
      assert.equal(ranked[0]?.id, expected, `work ranked "${prompt}" as ${ranked[0]?.id}`);
      // The pack keeps its documented READ order; what it names as the
      // task's capability is the ranking, and that is what must agree.
      const pack = runCli(["context", "--for", prompt], dir).stdout;
      const chosen = pack.match(/specs\/(\w+)\/spec\.md.*\(the task's capability\)/)?.[1];
      assert.equal(chosen, expected,
        `context --for "${prompt}" chose ${chosen}, work said ${expected}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("FIX_SHAPED reads a slug the same way for every consumer", () => {
  for (const yes of ["0012-fix-the-parser", "0003-flaky-retry", "0007-sanitise-input"]) {
    assert.ok(FIX_SHAPED.test(yes), yes);
  }
  for (const no of ["0001-add-login", "0002-billing-exports"]) {
    assert.ok(!FIX_SHAPED.test(no), no);
  }
});

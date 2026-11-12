// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { TRACKS, classify, directSignals, trackOf } from "../src/lib/triage-model.js";
import { pulse } from "../src/lib/views.js";

// THE TRACKS, BY WHAT THE REQUEST CHANGES (change 0255).
//
// "Fix the typo in the README" opened a proposal, three tasks and a
// thirteen-step close. The rule that it need not was a footnote under a
// metric. BMAD names three tracks by the size of the work; here the measure
// is whether a sentence in a spec becomes false — and the CLI answers with
// the track instead of opening the change.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-tracks-"));
  const run = (/** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    return { status: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
  };
  run(["init", "--non-interactive", "--project-name", "tracks"]);
  const open = () => readdirSync(path.join(dir, ".doctrina", "changes")).filter((d) => /^\d{4}-/.test(d));
  return { dir, run, open, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("only the words that cannot mean behaviour make a prompt direct", () => {
  const track = (/** @type {string} */ p) => trackOf(p);
  for (const p of [
    "fix the typo in the README",
    "Fix a misspelling in the login error message",
    "remove dead code in the parser",
    "delete the stale comment above parse()",
    "trailing whitespace in src/",
    "corrigir erro de digitação na mensagem de login",
    "remover comentários obsoletos do parser",
    "tirar imports não usados",
  ]) assert.equal(track(p), "direct", p);

  // A bare "comment" or "formatting" is also the name of a feature.
  assert.notEqual(track("comment moderation queue"), "direct");
  assert.notEqual(track("date formatting for invoices"), "direct");
  // A product or a runtime signal beside the word: behaviour is in play.
  assert.equal(track("add a typo-tolerant search"), "change");
  assert.equal(track("users can fix a typo in their display name"), "change");
  assert.notEqual(track("fix the typo in the spec"), "direct", "a spec is edited through a change");
  assert.equal(track("the typo in the workflow makes the pipeline run 0 tests"), "diagnosis");
  assert.equal(track("bump the lockfile"), "chore");
  assert.deepEqual(directSignals("add login"), []);
  assert.deepEqual(directSignals("fix the typo and remove the dead code"), ["typo", "dead code"]);
  assert.deepEqual(TRACKS.map((t) => t.id), ["direct", "chore", "change"]);
  assert.equal(classify("fix the typo in the README").lane, "chore", "the lane reading is what it was");
});

test("work opens nothing for a direct edit, names the three tracks, and exits 0", () => {
  const p = project();
  try {
    const r = p.run(["work", "fix the typo in the README"]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /^direct: no change to open — this reads as an edit that changes nothing a spec says \(signals: typo\)/);
    assert.match(r.out, /Edit it, run doctrina verify, and commit\. No proposal, no delta, no close\./);
    assert.match(r.out, /\n {2}direct {2}nothing a spec says[^\n]*\n {10}edit · doctrina verify · commit\n {2}chore {3}[^\n]*\n {10}doctrina work --chore "<request>"\n {2}change {2}behaviour[^\n]*\n {10}doctrina work "<request>"\n/);
    assert.match(r.out, /doctrina work --force "<request>" {2}· {2}doctrina work --chore "<request>"/);
    assert.deepEqual(p.open(), [], "nothing was scaffolded");
    assert.equal(p.run(["validate"]).status, 0);

    // The author who says otherwise is believed.
    assert.match(p.run(["work", "fix the typo in the README", "--force", "--quiet"]).out, /opened 0001-/);
    assert.match(p.run(["work", "--chore", "fix the typo in the changelog", "--force", "--quiet"]).out, /opened 0002-/);
    assert.match(p.run(["work", "remove dead code in the parser", "--id", "0003-dead-code", "--force", "--quiet"]).out, /opened 0003-dead-code/);
    assert.equal(p.open().length, 3);
  } finally {
    p.done();
  }
});

test("naming a capability says a spec changes, and a behaviour prompt is opened as before", () => {
  const p = project();
  try {
    p.run(["spec", "new", "auth"]);
    assert.match(p.run(["work", "fix the typo in the login message", "--capability", "auth", "--quiet"]).out, /opened 0001-/);
    const q = project();
    try {
      assert.match(q.run(["work", "add comment moderation", "--quiet"]).out, /opened 0001-/);
    } finally {
      q.done();
    }
  } finally {
    p.done();
  }
});

test("triage names the track, in text and in --json", () => {
  const p = project();
  try {
    const r = p.run(["triage", "remove dead code in the parser"]);
    assert.match(r.out, /^Track — deterministic term match; a hint, not a decision\n\n {2}DIRECT {2}nothing a spec says changes\n {2}signals: dead code\n/);
    assert.match(r.out, /no change is opened/);
    assert.doesNotMatch(r.out, /PRODUCT|CHORE/, "one reading, not two");
    assert.equal(JSON.parse(p.run(["triage", "remove dead code in the parser", "--json"]).stdout).track, "direct");
    assert.equal(JSON.parse(p.run(["triage", "add login", "--json"]).stdout).track, "change");
    assert.equal(JSON.parse(p.run(["triage", "--json"]).stdout).track, null);
    assert.match(p.run(["triage", "add login"]).out, /^Lane — /, "a behaviour prompt keeps the lane readout");
  } finally {
    p.done();
  }
});

test("every standing instruction states the direct track the same way", () => {
  const rule = /An edit that changes nothing a\s+spec says \(a typo, a comment,[^)]*\) needs none: edit, `doctrina\s+verify`, commit\./;
  for (const rel of [
    "AGENTS.md",
    ".doctrina/templates/AGENTS.md.template",
    ".doctrina/templates/adapters/cursor/.cursor/rules/00-doctrina.mdc.template",
    ".cursor/rules/00-doctrina.mdc",
  ]) {
    assert.ok(existsSync(path.join(repo, rel)), rel);
    assert.match(readFileSync(path.join(repo, rel), "utf8"), rule, rel);
  }
  assert.match(pulse([])[0], /an edit that changes nothing a spec says \(a typo, a comment, formatting, a fix restoring what the spec states\) needs none — edit, `doctrina verify`, commit\./);
  const help = spawnSync(process.execPath, [cliEntry, "work", "--help"], { encoding: "utf8" }).stdout;
  assert.match(help, /TRACKS\. How much ceremony a request earns is decided by what it changes,\nnot by the size of the diff:/);
});

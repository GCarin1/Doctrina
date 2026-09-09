import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { signoffState, declaredPaths, summarizeSignoffs } from "../src/lib/signoff.js";

// Change 0039 — a manual sign-off has an expiry.
//
// `verify --signoff` recorded { date, note }, nothing but `verify` ever read
// the file, and the signature held forever. The one deliberate escape hatch
// from the build gate was therefore the one place a green gate could lie
// indefinitely: sign off "the error copy reads well", rewrite every message
// the next morning, and the gate still says yes.
//
// ADR 0008 (honest gates) turned on the escape hatch itself. The rule these
// tests pin: only a signature that still demonstrably covers the code passes.
// Expired, unverifiable and pending all warn by default and fail --strict —
// the rule `pending` already followed, kept as ONE rule rather than two.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function git(cwd, ...args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

// A real repository: the expiry is a question about commits, so a fixture
// without one would be testing the fallback rather than the feature.
function project({ checks } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-signoff-"));
  git(dir, "init", "-q", ".");
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  mkdirSync(path.join(dir, "src"), { recursive: true });
  writeFileSync(path.join(dir, "src", "messages.js"), "the error copy\n");
  writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({
    checks: checks ?? [{ name: "copy", type: "manual", rubric: "does the error copy read well?", paths: ["src/messages.js"] }],
  }, null, 2) + "\n");
  git(dir, "add", "-A");
  git(dir, "-c", "user.email=a@b", "-c", "user.name=t", "commit", "-qm", "init");
  return dir;
}

const store = (dir) => JSON.parse(readFileSync(path.join(dir, ".doctrina", "verify.signoffs.json"), "utf8"));

// ----------------------------------------------------------- the record

test("a signature records what it covered and the commit it covered it at", () => {
  const dir = project();
  try {
    const r = runCli(["verify", "--signoff", "copy=reads well"], dir);
    assert.equal(r.status, 0, r.stderr);
    const rec = store(dir).copy;
    assert.equal(rec.note, "reads well");
    assert.match(rec.sha, /^[0-9a-f]{40}$/);
    assert.deepEqual(rec.paths, ["src/messages.js"]);
    // And it says so, so the later expiry is not a surprise.
    assert.match(r.stdout, /covers src\/messages\.js as of [0-9a-f]{8}/);
    assert.match(r.stdout, /expires when one of those paths changes/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a check that declares no paths is signed, and warned about at signing time", () => {
  // Not silently accepted: an unanchored signature is one nothing can hold to
  // the code, and the operator learns that when they sign, not months later.
  const dir = project({ checks: [{ name: "vibes", type: "manual", rubric: "does it feel right?" }] });
  try {
    const r = runCli(["verify", "--signoff", "vibes=trust me"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /declares no "paths" — the sign-off cannot expire/);
    assert.match(r.stdout, /report it as unverifiable rather than passing/);
    assert.equal(declaredPaths({ name: "vibes", type: "manual" }).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------- the states

test("a fresh signature passes, and expires the moment a covered path changes", () => {
  const dir = project();
  try {
    runCli(["verify", "--signoff", "copy=reads well"], dir);

    const fresh = runCli(["verify"], dir);
    assert.equal(fresh.status, 0, fresh.stdout);
    assert.match(fresh.stdout, /✓ copy .* still covers src\/messages\.js at [0-9a-f]{8}/);

    // The defect this change closes, reproduced: the signed statement is
    // about copy that no longer exists.
    writeFileSync(path.join(dir, "src", "messages.js"), "rewritten overnight\n");
    const expired = runCli(["verify"], dir);
    assert.match(expired.stdout, /○ copy — sign-off expired/);
    assert.match(expired.stdout, /changed since: src\/messages\.js/);
    assert.match(expired.stdout, /doctrina verify --signoff "copy=<note>"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an uncommitted edit expires the signature too, not just a commit", () => {
  // A signature is about the code as it stands. Comparing only committed
  // history would call a rewritten working tree "fresh".
  const dir = project();
  try {
    runCli(["verify", "--signoff", "copy=reads well"], dir);
    writeFileSync(path.join(dir, "src", "messages.js"), "edited but not committed\n");
    assert.match(runCli(["verify"], dir).stdout, /sign-off expired/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a change elsewhere leaves the signature alone", () => {
  // Expiry has to be scoped, or every commit invalidates every signature and
  // the mechanism becomes noise people learn to ignore.
  const dir = project();
  try {
    runCli(["verify", "--signoff", "copy=reads well"], dir);
    writeFileSync(path.join(dir, "src", "unrelated.js"), "// not covered\n");
    assert.match(runCli(["verify"], dir).stdout, /✓ copy/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a pre-expiry signature is UNVERIFIABLE, neither trusted nor called expired", () => {
  // The legacy rule, decided rather than defaulted: a record with no commit
  // cannot answer "has what I signed moved?", and silence about whether
  // evidence still holds is not evidence that it does. It does not pass — but
  // it is not reported as expired either, because nobody knows that it is.
  const dir = project();
  try {
    runCli(["verify", "--signoff", "copy=reads well"], dir);
    const s = store(dir);
    delete s.copy.sha;
    delete s.copy.paths;
    writeFileSync(path.join(dir, ".doctrina", "verify.signoffs.json"), JSON.stringify(s, null, 2) + "\n");

    const r = runCli(["verify"], dir);
    assert.match(r.stdout, /○ copy — sign-off cannot be verified/);
    assert.match(r.stdout, /signed before sign-offs recorded a commit/);
    assert.doesNotMatch(r.stdout, /expired/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every non-fresh state warns by default and fails --strict — one rule, not two", () => {
  const dir = project({ checks: [
    { name: "signed", type: "manual", rubric: "q", paths: ["src/messages.js"] },
    { name: "never", type: "manual", rubric: "q" },
  ] });
  try {
    // Only `never` is unsigned: default run reports, --strict refuses.
    runCli(["verify", "--signoff", "signed=ok"], dir);
    assert.equal(runCli(["verify"], dir).status, 0, "a pending sign-off must not block a local run");
    assert.equal(runCli(["verify", "--strict"], dir).status, 1, "--strict must require the sign-off");

    // Expire the signed one; the default run still reports, --strict still refuses.
    writeFileSync(path.join(dir, "src", "messages.js"), "changed\n");
    assert.equal(runCli(["verify"], dir).status, 0);
    assert.equal(runCli(["verify", "--strict"], dir).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("outside a repository the signature is unverifiable, not assumed fresh", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-signoff-norepo-"));
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], dir);
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src", "messages.js"), "copy\n");
    writeFileSync(path.join(dir, ".doctrina", "verify.json"),
      JSON.stringify({ checks: [{ name: "copy", type: "manual", rubric: "q", paths: ["src/messages.js"] }] }, null, 2));
    const signed = runCli(["verify", "--signoff", "copy=ok"], dir);
    assert.match(signed.stdout, /not a git repository — nothing can tell when this signature goes stale/);
    assert.match(runCli(["verify"], dir).stdout, /sign-off cannot be verified/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -------------------------------------------------- executed vs signed

test("the views separate executed proof from signed proof", () => {
  const dir = project({ checks: [
    { name: "test", run: "node --version" },
    { name: "copy", type: "manual", rubric: "q", paths: ["src/messages.js"] },
  ] });
  try {
    runCli(["verify", "--signoff", "copy=ok"], dir);
    const fresh = runCli(["status"], dir).stdout;
    assert.match(fresh, /2 checks · 1 signed/, "a dashboard that adds executed and signed together hides which is which");

    writeFileSync(path.join(dir, "src", "messages.js"), "changed\n");
    for (const view of ["dashboard", "prime", "handoff", "report"]) {
      const out = runCli(["status", "--view", view], dir).stdout;
      assert.match(out, /1 signed, 1 expired/, `${view} must say the signature no longer holds`);
    }
    assert.match(runCli(["doctor"], dir).stdout, /signed rather than executed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the summary counts each manual check into exactly one state", () => {
  const dir = project({ checks: [
    { name: "a", type: "manual", rubric: "q", paths: ["src/messages.js"] },
    { name: "b", type: "manual", rubric: "q", paths: ["src/messages.js"] },
    { name: "c", type: "manual", rubric: "q" },
    { name: "d", run: "node --version" },
  ] });
  try {
    runCli(["verify", "--signoff", "a=ok"], dir);
    runCli(["verify", "--signoff", "c=ok"], dir);
    const checks = JSON.parse(readFileSync(path.join(dir, ".doctrina", "verify.json"), "utf8")).checks;
    const counts = summarizeSignoffs(dir, checks);
    assert.equal(counts.manual, 3, "the executed check is not a manual one");
    assert.equal(counts.fresh + counts.expired + counts.unverifiable + counts.pending, counts.manual);
    assert.equal(counts.fresh, 1);        // a
    assert.equal(counts.unverifiable, 1); // c — no paths
    assert.equal(counts.pending, 1);      // b — never signed
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a record with no date is pending, whatever else it carries", () => {
  assert.equal(signoffState("/nowhere", { name: "x", paths: ["a"] }, undefined).state, "pending");
  assert.equal(signoffState("/nowhere", { name: "x", paths: ["a"] }, { note: "no date" }).state, "pending");
});

// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// A REPLACEMENT DECIDES THE SAME SUBJECT, SO IT STARTS WITH THE SAME REACH.
//
// An ADR's `Scope:` is what keeps it out of packs it does not govern (ADR
// 0022: a pack is retrieval, not a dump). `decision supersede` built the
// successor from the bare template and injected only `Supersedes:`, so the
// successor had no scope — and an unscoped ADR is GLOBAL. Refining a decision
// that governed one capability, then accepting the refinement, loaded it into
// every capability's context pack, ones the original never touched, and
// nothing said so.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function adrPath(dir, number) {
  const d = path.join(dir, ".doctrina", "decisions");
  return path.join(d, readdirSync(d).find((f) => f.startsWith(`${number}-`)) ?? "");
}

// Write real sections (accept refuses a template body), optionally a Scope.
function author(file, scope) {
  let t = readFileSync(file, "utf8");
  for (const sec of ["Context", "Decision", "Consequences"]) {
    t = t.replace(new RegExp(`(## ${sec}\\n)([\\s\\S]*?)(?=\\n## |$)`), `$1\nReal ${sec} text.\n`);
  }
  if (scope) t = t.replace("- **Deciders:**", `- **Scope:** ${scope}\n- **Deciders:**`);
  writeFileSync(file, t);
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-supersede-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  for (const cap of ["alfa", "beta"]) assert.equal(runCli(["spec", "new", cap], dir).status, 0);
  return dir;
}

function acceptedScoped(dir, scope) {
  assert.equal(runCli(["decision", "new", "usar postgres"], dir).status, 0);
  author(adrPath(dir, "0001"), scope);
  assert.equal(runCli(["index", "rebuild"], dir).status, 0);
  const r = runCli(["decision", "accept", "0001"], dir);
  assert.equal(r.status, 0, r.stderr || r.stdout);
}

const packLoads = (dir, cap, number) =>
  runCli(["context", cap], dir).stdout.includes(`decisions/${number}-`);

test("a successor inherits its predecessor's scope", () => {
  const dir = project();
  try {
    acceptedScoped(dir, "alfa");
    const r = runCli(["decision", "supersede", "0001", "usar sqlite"], dir);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(readFileSync(adrPath(dir, "0002"), "utf8"), /^- \*\*Scope:\*\* alfa$/m);
    assert.match(r.stdout, /scope: inherited from 0001 — alfa/,
      "the inheritance is said out loud, where the author can see it and change it");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The consequence the scope exists to prevent, measured through `context`.
test("an accepted successor stays out of the packs its predecessor stayed out of", () => {
  const dir = project();
  try {
    acceptedScoped(dir, "alfa");
    assert.equal(packLoads(dir, "beta", "0001"), false, "precondition: the original is scoped");
    assert.equal(runCli(["decision", "supersede", "0001", "usar sqlite"], dir).status, 0);
    author(adrPath(dir, "0002"));
    assert.equal(runCli(["decision", "accept", "0002"], dir).status, 0);
    assert.equal(packLoads(dir, "alfa", "0002"), true);
    assert.equal(packLoads(dir, "beta", "0002"), false,
      "refining a decision must not widen it to capabilities it never governed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unscoped predecessor yields an unscoped successor", () => {
  const dir = project();
  try {
    acceptedScoped(dir, null);
    const r = runCli(["decision", "supersede", "0001", "usar sqlite"], dir);
    assert.equal(r.status, 0);
    assert.doesNotMatch(readFileSync(adrPath(dir, "0002"), "utf8"), /\*\*Scope:\*\*/,
      "a global decision's replacement is global — nothing is invented");
    assert.doesNotMatch(r.stdout, /inherited/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

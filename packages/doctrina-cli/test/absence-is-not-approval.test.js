import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { isPlaceholderHeaderValue } from "../src/lib/doc-model.js";

// Change 0057 — absence is not approval.
//
// Two halves of one habit. Coverage over zero criteria projected to 100%,
// so the first number a new project read about itself was a perfect score
// over nothing — while `doctor`, reading the same collection, warned. And
// the `Realizes:` check fired only on a MISSING header, which the scaffold
// never leaves missing: it writes a placeholder, so the escape hatch arrived
// pre-armed and the check was dead in the normal flow.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-absence-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return dir;
}

const specPath = (dir, cap) => path.join(dir, ".doctrina", "specs", cap, "spec.md");

// A spec the CLI scaffolded, with its placeholder acceptance criteria removed
// so the project genuinely declares none.
function specWithoutCriteria(dir, cap) {
  assert.equal(run(dir, ["spec", "new", cap]).status, 0);
  const p = specPath(dir, cap);
  const text = readFileSync(p, "utf8").replace(/\r?\n\d+\. .*/g, "");
  writeFileSync(p, text);
  assert.equal(run(dir, ["index", "rebuild"]).status, 0);
}

// ------------------------------------------------------- A4: the ratio

test("no criteria is reported as no criteria, in every view", () => {
  const dir = project();
  try {
    specWithoutCriteria(dir, "invoicing");
    for (const cmd of [["status"], ["prime"], ["report"], ["handoff"]]) {
      const res = run(dir, cmd);
      assert.equal(res.status, 0, `${cmd[0]}: ${res.stderr}`);
      const line = res.stdout.split("\n").find((l) => /coverage/i.test(l)) ?? "";
      assert.match(line, /no criteria declared/, `${cmd[0]} printed: ${line}`);
      assert.doesNotMatch(line, /100%/, `${cmd[0]} must not score a ratio over nothing: ${line}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the coverage summary and its JSON say absence rather than 100%", () => {
  const dir = project();
  try {
    specWithoutCriteria(dir, "invoicing");
    const human = run(dir, ["coverage"]);
    assert.equal(human.status, 0, human.stderr);
    assert.doesNotMatch(human.stdout, /100%/, human.stdout);

    const res = run(dir, ["coverage", "--json"]);
    assert.equal(res.status, 0, res.stderr);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.summary.criteria, 0);
    assert.equal(payload.summary.pct, null, "null is the honest value; 100 was a claim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor and the other views agree about the same empty collection", () => {
  const dir = project();
  try {
    specWithoutCriteria(dir, "invoicing");
    const doc = run(dir, ["doctor"]);
    const line = doc.stdout.split("\n").find((l) => /coverage/i.test(l)) ?? "";
    assert.match(line, /warn/, line);
    assert.match(line, /no acceptance criteria declared/, line);
    // Change 0037 unified the views so they could not disagree; this is the
    // one number that still did.
    assert.doesNotMatch(doc.stdout, /coverage\s+100%/, doc.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a real ratio is still a ratio", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "invoicing"]).status, 0);
    const res = run(dir, ["coverage", "--json"]);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.summary.criteria, 1, "the scaffold ships one placeholder criterion");
    assert.equal(payload.summary.pct, 0, "one uncovered criterion is 0%, not null");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --------------------------------------------------- A5: the escape hatch

test("isPlaceholderHeaderValue treats the scaffold's own value as absent", () => {
  assert.equal(isPlaceholderHeaderValue(null), true);
  assert.equal(isPlaceholderHeaderValue("  "), true);
  assert.equal(isPlaceholderHeaderValue('<product.md success-criteria anchors this delivers, or "n/a — <why>">'), true);
  assert.equal(isPlaceholderHeaderValue("SC1, SC2"), false);
  assert.equal(isPlaceholderHeaderValue("n/a — internal capability"), false);
});

test("an active spec still carrying the scaffold's Realizes placeholder warns", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "invoicing"]).status, 0);
    const p = specPath(dir, "invoicing");
    const scaffold = readFileSync(p, "utf8");
    assert.match(scaffold, /^\*\*Realizes:\*\* </m,
      "the scaffold writes a placeholder — that is what pre-armed the escape hatch");
    writeFileSync(p, scaffold.replace("**Status:** draft", "**Status:** active"));
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);

    const res = run(dir, ["validate"]);
    assert.match(res.stdout + res.stderr, /still carries the scaffold's Realizes: header/,
      res.stdout + res.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a deliberate n/a and a real anchor both stay silent", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "invoicing"]).status, 0);
    const p = specPath(dir, "invoicing");
    const base = readFileSync(p, "utf8").replace("**Status:** draft", "**Status:** active");
    for (const value of ["n/a — internal capability, no product anchor", "SC1"]) {
      writeFileSync(p, base.replace(/^\*\*Realizes:\*\* .*$/m, `**Realizes:** ${value}`));
      assert.equal(run(dir, ["index", "rebuild"]).status, 0);
      const res = run(dir, ["validate"]);
      assert.doesNotMatch(res.stdout + res.stderr, /Realizes: header/,
        `"${value}" must silence the check:\n${res.stdout}${res.stderr}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

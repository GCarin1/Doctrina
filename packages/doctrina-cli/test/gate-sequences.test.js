import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEQUENCES, sequence, stepRerun } from "../src/lib/gates.js";
import { emitGithub } from "../src/commands/ci.js";

// Change 0034 — one gate map.
//
// ADR 0017 promised a single declaration of which gates guard what, and for
// two releases `lib/gates.js` delivered it for `apply`/`archive` only. `close`
// carried its own array of ten steps, `doctor` eight hand-written rows, and
// `action.yml` five YAML steps: four lists, no mechanism that noticed when
// they diverged.
//
// The property these pin is not "the lists happen to match today" — it is
// that the surfaces DERIVE from the declaration, so they cannot diverge
// tomorrow. Each test below fails if a surface starts carrying its own copy.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const src = (rel) => readFileSync(path.resolve(here, "..", "src", rel), "utf8");

test("every declared sequence step carries the fields the surfaces render", () => {
  const levels = new Set(["blocking", "advisory", "forceable"]);
  for (const [name, steps] of Object.entries(SEQUENCES)) {
    assert.ok(steps.length > 0, `${name} declares no steps`);
    const ids = steps.map((s) => s.id);
    assert.deepEqual(ids, [...new Set(ids)], `${name} declares a duplicate step id`);
    for (const step of steps) {
      assert.match(step.id, /^[a-z][a-z0-9-]*$/, `${name}: bad step id "${step.id}"`);
      assert.ok(step.label, `${name}/${step.id} has no label`);
      assert.ok(levels.has(step.level), `${name}/${step.id} has level "${step.level}"`);
      // A step must be runnable or explain itself: either it names the
      // command that runs it, or it declares the line an operator reruns.
      assert.ok(step.argv || step.rerun, `${name}/${step.id} declares neither argv nor rerun`);
      assert.ok(stepRerun(step, "0001-x").startsWith("doctrina ") || step.rerun,
        `${name}/${step.id} has no usable rerun line`);
    }
  }
});

test("the change id reaches the steps that need it, and only those", () => {
  const close = sequence("close");
  assert.equal(stepRerun(close.find((s) => s.id === "analyze"), "0007-x"), "doctrina analyze 0007-x");
  assert.equal(stepRerun(close.find((s) => s.id === "validate"), "0007-x"), "doctrina validate");
  // The docs gate is not one command, so it keeps its own literal line.
  assert.equal(stepRerun(close.find((s) => s.id === "docs"), "0007-x"), "edit docs/ (EN + PT), then rerun");
});

test("close derives its steps from the declaration, not from its own array", () => {
  const text = src("commands/close.js");
  assert.match(text, /sequence\("close"\)/, "close must read the declared sequence");
  // Every declared step id is bound in close's runner table, or close would
  // silently fall back to spawning it — allowed, but not for the ten steps
  // that exist today, which all have in-process runners.
  for (const step of sequence("close")) {
    assert.match(text, new RegExp(`["']?${step.id}["']?\\s*:`),
      `close has no runner bound for the declared step "${step.id}"`);
  }
});

test("doctor derives its rows from the declaration, not from its own list", () => {
  const text = src("commands/doctor.js");
  assert.match(text, /sequence\("doctor"\)/, "doctor must read the declared sequence");
  for (const step of sequence("doctor")) {
    assert.match(text, new RegExp(`["']?${step.id}["']?\\s*:`),
      `doctor has no reporter bound for the declared step "${step.id}"`);
  }
});

test("`ci --emit github` reproduces the versioned action.yml byte for byte", () => {
  // The action stays versioned because a project writing `uses: owner/repo@v1`
  // has no CLI to generate it with. This is what keeps the committed file and
  // the declaration from drifting apart anyway.
  const committed = readFileSync(path.join(repoRoot, "action.yml"), "utf8");
  assert.equal(emitGithub(), committed,
    "action.yml is stale — re-emit it with `doctrina ci --emit github > action.yml`");
});

test("a gate added to the declaration reaches the CI surface with no further edit", () => {
  // The guarantee the change exists for, exercised rather than asserted: a
  // step that no surface has ever heard of still renders, because the
  // renderer reads the declaration instead of a copy of it.
  const withExtra = [
    ...sequence("ci"),
    { id: "invented", label: "doctrina invented", level: "blocking", argv: ["invented", "--now"], short: "invented", summary: "invented (a gate no surface knows)" },
  ];
  const yaml = emitGithub(withExtra);
  assert.match(yaml, /- name: doctrina invented/);
  assert.match(yaml, /run: \$\{\{ steps\.cli\.outputs\.prefix \}\} invented --now/);
  assert.match(yaml, /invented \(a gate no surface knows\)/, "the file header must list it too");
  // And it lands after the steps already declared, never reordered.
  assert.ok(yaml.indexOf("doctrina invented") > yaml.indexOf("doctrina trace"));
});

test("the strict input still decides coverage and trace, and only those", () => {
  const yaml = emitGithub();
  const strictBlocks = [...yaml.matchAll(/if \[ "\$\{\{ inputs\.strict \}\}" = "true" \]/g)];
  assert.equal(strictBlocks.length, 2, "exactly coverage and trace read the strict input");
  // The runtime gate is deliberately not one of them: a declaration that does
  // not hold is an error at any adoption stage.
  const contractStep = yaml.slice(yaml.indexOf("- name: doctrina contract check"));
  const nextStep = contractStep.indexOf("\n    - name:", 1);
  assert.doesNotMatch(contractStep.slice(0, nextStep), /inputs\.strict/);
});

// ── Change 0041: the review runs inside the close, advisory. ──

test("close runs review before apply, reports its findings, and is not moved by them", () => {
  // `review` is the richest conformance analysis the project has — capabilities
  // whose code moved while their spec did not, affected dependants, dangling
  // coverage — and no driver invoked it, so it only happened when somebody
  // typed the command. It runs BEFORE the apply, where its findings can still
  // change what gets written, and advisory, because it raises a break for
  // every capability with touched code and a still spec: that noise has to be
  // measured before it is allowed to refuse.
  const close = sequence("close");
  const ids = close.map((s) => s.id);
  assert.ok(ids.includes("review"), "the close must run the review");
  assert.ok(ids.indexOf("review") < ids.indexOf("apply"),
    "after the apply, the review's findings can no longer change what was written");
  assert.equal(close.find((s) => s.id === "review").level, "advisory");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePipeline, checkPipeline } from "../src/lib/pipeline.js";

// Ordered requirements (change 0029). EARS states each event-driven
// requirement independently and truthfully, and says nothing about order —
// so "when the run finishes, append a summary" and "when the analysis
// completes, publish the dashboard" both pass while the dashboard renders
// an analysis that has not run yet. These pin the one invariant an ordered
// list cannot enforce on its own: a step may only require what an EARLIER
// step produced.

function spec(pipeline) {
  return `# Spec — x\n\n## Requirements (EARS)\n\n### Pipeline\n\n${pipeline}\n\n### Ubiquitous\n\n- The system shall x.\n`;
}

const codes = (f) => f.map((x) => x.code);

test("a spec with no Pipeline block parses to null and is never checked", () => {
  assert.equal(parsePipeline("# Spec — x\n\n## Requirements (EARS)\n\n### Ubiquitous\n\n- x\n"), null);
  assert.deepEqual(checkPipeline(null), []);
});

test("steps parse with their requires and produces", () => {
  const steps = parsePipeline(spec(
    "1. run-suite — produces `reports/results.json`\n" +
    "2. analyse — requires `reports/results.json`, produces `reports/analysis.md`\n" +
    "3. publish — requires `reports/analysis.md`",
  ));
  assert.equal(steps.length, 3);
  assert.equal(steps[0].name, "run-suite");
  assert.deepEqual(steps[0].produces, ["reports/results.json"]);
  assert.deepEqual(steps[1].requires, ["reports/results.json"]);
  assert.deepEqual(steps[1].produces, ["reports/analysis.md"]);
  assert.deepEqual(steps[2].requires, ["reports/analysis.md"]);
});

test("a well-ordered pipeline produces no findings", () => {
  const steps = parsePipeline(spec(
    "1. run-suite — produces `reports/results.json`\n" +
    "2. analyse — requires `reports/results.json`, produces `reports/analysis.md`\n" +
    "3. publish — requires `reports/analysis.md`",
  ));
  assert.deepEqual(checkPipeline(steps), []);
});

test("PL02: a step requiring what a LATER step produces is the stale-read bug", () => {
  const steps = parsePipeline(spec(
    "1. publish — requires `reports/analysis.md`\n" +
    "2. analyse — produces `reports/analysis.md`",
  ));
  const findings = checkPipeline(steps);
  assert.deepEqual(codes(findings), ["PL02"]);
  assert.match(findings[0].message, /can only ever read the previous run's copy/);
});

test("PL02: a step that requires and produces the same artifact is flagged", () => {
  const steps = parsePipeline(spec("1. both — requires `a.json`, produces `a.json`"));
  assert.deepEqual(codes(checkPipeline(steps)), ["PL02"]);
});

test("PL03: requiring an artifact no step produces names the missing producer", () => {
  const steps = parsePipeline(spec("1. publish — requires `reports/analysis.md`"));
  const findings = checkPipeline(steps);
  assert.deepEqual(codes(findings), ["PL03"]);
  assert.match(findings[0].message, /which no step produces/);
  assert.match(findings[0].remedy, /external/);
});

test("an (external) input is declared, not missing", () => {
  const steps = parsePipeline(spec("1. publish — requires `config.yml` (external)"));
  assert.deepEqual(steps[0].external, ["config.yml"]);
  assert.deepEqual(steps[0].requires, []);
  assert.deepEqual(checkPipeline(steps), []);
});

test("PL01: the declared order must be the order it reads in", () => {
  const steps = parsePipeline(spec(
    "1. a — produces `x`\n" +
    "3. b — requires `x`",
  ));
  const findings = checkPipeline(steps);
  assert.ok(codes(findings).includes("PL01"));
});

test("a step can require several artifacts at once", () => {
  const steps = parsePipeline(spec(
    "1. a — produces `x`\n" +
    "2. b — produces `y`\n" +
    "3. c — requires `x`, `y`",
  ));
  assert.deepEqual(steps[2].requires, ["x", "y"]);
  assert.deepEqual(checkPipeline(steps), []);
});

test("findings carry a line number so the warning points at the step", () => {
  const steps = parsePipeline(spec("1. publish — requires `missing.md`"));
  const findings = checkPipeline(steps);
  assert.ok(findings[0].line > 0);
});

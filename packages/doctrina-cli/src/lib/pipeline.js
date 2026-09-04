// @ts-check
import { getSection } from "./doc-model.js";

// ORDERED requirements: what EARS cannot say.
//
// EARS event-driven requirements are individually true and mutually
// unordered. "When the run finishes, the system shall append a summary" and
// "When the analysis completes, the system shall publish the dashboard" both
// pass every gate, and neither says the dashboard needs the analysis to have
// run first. So "the dashboard includes this run's analysis" gets read as
// "call the renderer at the end" without anyone checking whether the thing
// it renders exists yet — and the failure is a published dashboard that is
// silently one run stale, which no structural check can see.
//
// A Pipeline block states the order and the artifact each step hands on:
//
//   ### Pipeline
//
//   1. run-suite — produces `reports/results.json`
//   2. analyse — requires `reports/results.json`, produces `reports/analysis.md`
//   3. publish — requires `reports/analysis.md`
//
// The invariant is the one an ordered list cannot enforce on its own: a step
// may only require what an EARLIER step produced. Requiring something a
// later step produces is the inversion; requiring something no step produces
// is the missing producer. Both are errors, and both are exactly the bug
// that ships as "green, and a run behind".
//
// Artifacts that genuinely come from outside are marked `(external)`.

/**
 * @typedef {object} PipelineStep
 * @property {number} number    The declared ordinal.
 * @property {string} name
 * @property {string[]} requires
 * @property {string[]} produces
 * @property {string[]} external  Requirements declared as coming from outside.
 * @property {number} line        1-based line within the spec.
 */

/**
 * Parse the `### Pipeline` block of a spec. Returns null when the spec
 * declares none — the block is opt-in, so every spec written before it
 * existed parses to null and is never checked.
 *
 * @returns {PipelineStep[] | null}
 */
export function parsePipeline(text) {
  const section = getSection(text, "Pipeline", { level: 3 });
  if (!section || !section.trim()) return null;

  const all = String(text).split(/\r?\n/);
  const offset = all.findIndex((l) => /^###\s+Pipeline\s*$/.test(l));

  const steps = [];
  const lines = section.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(\d+)\.\s+(.*\S)\s*$/);
    if (!m) continue;
    const number = Number.parseInt(m[1], 10);
    const body = m[2];

    // The step name is everything up to the first clause separator.
    const name = body.split(/\s+[—-]\s+|\s*,\s*(?=requires|produces)/)[0].trim();

    steps.push({
      number,
      name,
      requires: clause(body, "requires").filter((a) => !a.external).map((a) => a.name),
      external: clause(body, "requires").filter((a) => a.external).map((a) => a.name),
      produces: clause(body, "produces").map((a) => a.name),
      line: offset >= 0 ? offset + 1 + i + 1 : i + 1,
    });
  }
  return steps;
}

// The artifacts named by one clause: `requires \`a\`, \`b\` (external)`.
// Backticks are how a spec already marks a path, so they are the anchor.
function clause(body, keyword) {
  const re = new RegExp(`${keyword}\\s+([^;]*?)(?=(?:\\brequires\\b|\\bproduces\\b|$))`, "i");
  const m = body.match(re);
  if (!m) return [];
  const out = [];
  for (const artifact of m[1].matchAll(/`([^`]+)`(\s*\(external\))?/g)) {
    out.push({ name: artifact[1].trim(), external: Boolean(artifact[2]) });
  }
  return out;
}

/**
 * Check the ordering invariant.
 * @param {PipelineStep[]} steps
 * @returns {Array<{code: string, level: "error"|"warn", message: string, remedy: string, line: number}>}
 */
export function checkPipeline(steps) {
  /** @type {Array<{code: string, level: "error"|"warn", message: string, remedy: string, line: number}>} */
  const findings = [];
  if (!steps || steps.length === 0) return findings;

  // Numbering first: an out-of-order list is not a pipeline, and every
  // check below reads the declared order as the real one.
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].number !== i + 1) {
      findings.push({
        code: "PL01",
        level: "error",
        message: `pipeline step ${i + 1} is numbered ${steps[i].number} ("${steps[i].name}") — the order a pipeline declares must be the order it reads in`,
        remedy: "renumber the Pipeline steps 1..n in execution order",
        line: steps[i].line,
      });
    }
  }

  // Everything produced at or before each index, which is what "earlier"
  // means. Built as we walk, so a step can never satisfy itself.
  const producedBefore = new Set();
  const producedBy = new Map();
  for (const step of steps) {
    for (const artifact of step.produces) {
      if (!producedBy.has(artifact)) producedBy.set(artifact, step);
    }
  }

  for (const step of steps) {
    for (const artifact of step.requires) {
      if (producedBefore.has(artifact)) continue;

      const producer = producedBy.get(artifact);
      if (producer && producer.number > step.number) {
        // The inversion: the consumer runs first and reads last run's file.
        findings.push({
          code: "PL02",
          level: "error",
          message: `step ${step.number} ("${step.name}") requires \`${artifact}\`, which step ${producer.number} ("${producer.name}") produces LATER — this step can only ever read the previous run's copy`,
          remedy: `move "${producer.name}" before "${step.name}", or make the dependency explicit and drop the requirement`,
          line: step.line,
        });
      } else if (producer && producer.number === step.number) {
        findings.push({
          code: "PL02",
          level: "error",
          message: `step ${step.number} ("${step.name}") both requires and produces \`${artifact}\``,
          remedy: `split the step, or mark the input \`${artifact}\` (external) if it comes from outside the pipeline`,
          line: step.line,
        });
      } else {
        findings.push({
          code: "PL03",
          level: "error",
          message: `step ${step.number} ("${step.name}") requires \`${artifact}\`, which no step produces — the step runs against a file nothing in this pipeline creates`,
          remedy: `add the producing step, or mark it \`${artifact}\` (external) to declare it comes from outside`,
          line: step.line,
        });
      }
    }
    for (const artifact of step.produces) producedBefore.add(artifact);
  }

  return findings;
}

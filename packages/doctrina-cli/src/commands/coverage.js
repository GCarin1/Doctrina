// @ts-check
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { exists, isFile, read, relPath } from "../lib/fs-ops.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { notADoctrinaProject, EXIT } from "../lib/exit-codes.js";
import { suggest } from "../lib/suggest.js";
import { isDir } from "../lib/fs-ops.js";
import { readdirSync } from "node:fs";
import { collect, summarize } from "../lib/coverage-model.js";

// The numbers this command reports come from lib/coverage-model.js, which
// `status`, `review`, `validate`, `close` and `spec set` read too — so no
// two surfaces can disagree about what "covered" means, and none of them
// has to import out of this file to find out (audit finding F7).
export { collect, summarize, deriveImplementation, derivedImplementations, implementationMismatch } from "../lib/coverage-model.js";

// Traceability report: how many acceptance criteria cite an artifact or
// test that actually exists on disk. Doctrina otherwise has no link
// between what a spec promises and what proves it — this command makes
// that link a first-class, measurable signal (the gap the framework was
// criticised for: validating form, never truth).
//
// Convention: each numbered acceptance criterion may cite its evidence as
// a backtick path span, e.g.
//   1. Returns HTTP 429 above the quota — verified by `test/quota.test.ts`.
// A criterion is "covered" when at least one cited path resolves to a
// real proof, "conditional" when its only resolving proof is a test file
// whose suite is skipped (a `describe.skip`/`xit`/`@pytest.mark.skip` that
// proves nothing — review G3: existence ≠ a passing test), "dangling" when
// a cited path does not resolve, and "bare" when nothing is cited.

// Flags this command accepts. Declared HERE, with the command, so
// adding a command never requires editing the entrypoint — the gap that
// let six flags ship undeclared and silently swallow a positional (C3).
// This command builds its own JSON payload; the entrypoint must not
// wrap it in the generic envelope.
export const jsonNative = true;

export const flags = { boolean: ["json", "run", "strict"], string: ["only"] };

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw notADoctrinaProject();
  }
  const strict = flagBool(flags, "strict", false);
  const json = flagBool(flags, "json", false);

  // --only <cap,cap>: scope the report/gate to specific capabilities — the
  // hook `doctrina close` uses so one deliberately deferred spec elsewhere in
  // the tree cannot block closing a change that never touched it.
  const onlyRaw = flagString(flags, "only");
  const only = onlyRaw ? new Set(onlyRaw.split(",").map((s) => s.trim()).filter(Boolean)) : null;

  // A filter that matches no capability is a USAGE error, not a clean gate.
  // It used to fall through to "no acceptance criteria found under
  // .doctrina/specs/" and exit 0 — on THIS repository, which declares over
  // two hundred of them — `--strict` included. So a CI job running
  // `coverage --only billing --strict` stayed green forever once the
  // capability was renamed or split: the failure looked exactly like
  // success. RT05 already refuses a contract selector that matches zero
  // targets, for the same reason (change 0090).
  if (only) {
    const known = knownCapabilities(projectRoot);
    const missing = [...only].filter((cap) => !known.includes(cap));
    if (missing.length > 0) {
      for (const cap of missing) {
        console.error(c.red("error:") + ` --only names no capability with a spec: "${cap}"`);
        const guess = suggest(cap, known);
        if (guess) console.error(c.gray("hint: ") + `did you mean "${guess}"?`);
      }
      if (known.length > 0) console.error(c.gray("known: ") + known.sort().join(", "));
      return EXIT.USAGE;
    }
  }

  const reports = collect(projectRoot, { only });

  // --run: execute the cited evidence instead of only checking it exists —
  // promotes "the file is on disk" to "the proof passes". The runner is
  // project-declared in .doctrina/verify.json ("evidence_runner": a command
  // template with a {file} placeholder); the CLI never guesses a test runner.
  if (flagBool(flags, "run", false)) {
    return runEvidence(projectRoot, reports, strict);
  }

  if (reports.length === 0) {
    if (json) {
      emitJson("coverage", { specs: [], summary: { criteria: 0, covered: 0, dangling: 0, conditional: 0, pct: null } });
      return 0;
    }
    // The two cases used to share one sentence, and the shared one was the
    // false one whenever a filter was in play.
    console.log(c.gray(only
      ? `no acceptance criteria declared by ${[...only].sort().join(", ")}`
      : "no acceptance criteria found under .doctrina/specs/"));
    return 0;
  }

  let totalCriteria = 0;
  let totalCovered = 0;
  let totalDangling = 0;
  let totalConditional = 0;
  let totalUnguarded = 0;
  let totalDeferred = 0;
  for (const rep of reports) {
    totalCriteria += rep.rows.length;
    totalCovered += rep.rows.filter((r) => r.kind === "covered").length;
    totalDangling += rep.rows.filter((r) => r.kind === "dangling").length;
    totalConditional += rep.rows.filter((r) => r.kind === "conditional").length;
    totalUnguarded += rep.rows.filter((r) => r.kind === "unguarded").length;
    totalDeferred += rep.rows.filter((r) => r.kind === "deferred").length;
  }
  // null, not 100: a ratio over nothing is not a perfect score (change 0057).
  const jsonPct = totalCriteria === 0 ? null : Math.round((totalCovered / totalCriteria) * 100);
  // Deferred criteria are visible but never gate: declared debt ≠ hidden debt.
  const jsonClean = totalCovered + totalDeferred === totalCriteria && totalDangling === 0
    && totalConditional === 0 && totalUnguarded === 0;

  if (json) {
    emitJson("coverage", {
      specs: reports.map((rep) => ({ capability: rep.cap, deferred: rep.deferred, criteria: rep.rows })),
      summary: { criteria: totalCriteria, covered: totalCovered, dangling: totalDangling, conditional: totalConditional, unguarded: totalUnguarded, deferred: totalDeferred, pct: jsonPct },
    });
    return jsonClean ? 0 : strict ? 1 : 0;
  }

  console.log(c.bold("Coverage") + c.gray(" — acceptance criteria with linked evidence:"));
  console.log("");

  for (const rep of reports) {
    const covered = rep.rows.filter((r) => r.kind === "covered").length;
    const dangling = rep.rows.filter((r) => r.kind === "dangling").length;
    const conditional = rep.rows.filter((r) => r.kind === "conditional").length;
    const unguarded = rep.rows.filter((r) => r.kind === "unguarded").length;
    const deferredN = rep.rows.filter((r) => r.kind === "deferred").length;

    const notes = [];
    if (conditional > 0) notes.push(c.yellow(`${conditional} conditional`));
    if (unguarded > 0) notes.push(c.yellow(`${unguarded} unguarded`));
    if (dangling > 0) notes.push(c.yellow(`${dangling} dangling`));
    if (deferredN > 0) notes.push(c.gray(`${deferredN} deferred`));
    const note = notes.length > 0 ? `  (${notes.join(", ")})` : "";
    console.log(`  ${c.cyan(rep.cap.padEnd(20))} ${covered}/${rep.rows.length} criteria${note}`);
    for (const r of rep.rows) {
      if (r.kind === "covered") continue;
      if (r.kind === "deferred") {
        console.log(`    ${c.gray("○")} #${r.n}  deferred — spec declares "Implementation: planned — <why>" (visible, not gated)`);
      } else if (r.kind === "bare") {
        console.log(`    ${c.red("✗")} #${r.n}  no evidence linked — cite the file/test that proves it in backticks`);
      } else if (r.kind === "conditional") {
        console.log(`    ${c.yellow("!")} #${r.n}  evidence is a skipped test (proves nothing): ${r.skipped.map((m) => `\`${m}\``).join(", ")}`);
      } else if (r.kind === "unguarded") {
        console.log(`    ${c.red("✗")} #${r.n}  orchestration claim is not fail-closed: ${r.reason}`);
      } else {
        console.log(`    ${c.yellow("!")} #${r.n}  evidence not found on disk: ${r.missing.map((m) => `\`${m}\``).join(", ")}`);
      }
    }
  }

  const pct = totalCriteria === 0 ? null : Math.round((totalCovered / totalCriteria) * 100);
  console.log("");
  const specCount = `${reports.length} spec${reports.length === 1 ? "" : "s"}`;
  const summary = pct === null
    ? `no acceptance criteria declared across ${specCount} — nothing to cover yet`
    : `${totalCovered} of ${totalCriteria} acceptance criteria across ${specCount} have linked evidence (${pct}%)`;
  const clean = totalCovered + totalDeferred === totalCriteria && totalDangling === 0
    && totalConditional === 0 && totalUnguarded === 0;
  const extras = [];
  if (totalConditional > 0) extras.push(`${totalConditional} conditional`);
  if (totalUnguarded > 0) extras.push(`${totalUnguarded} unguarded`);
  if (totalDangling > 0) extras.push(`${totalDangling} dangling`);
  if (totalDeferred > 0) extras.push(`${totalDeferred} deferred (not gated)`);
  const extraSummary = extras.length > 0 ? `, ${extras.join(", ")}` : "";
  if (clean) {
    console.log(c.green("ok") + " " + summary + extraSummary);
    return 0;
  }
  console.log((strict ? c.red("fail") : c.yellow("gap")) + " " + summary + extraSummary);
  // A report by default (exit 0); a gate under --strict (exit 1 for CI). A
  // conditional criterion fails the gate too: a skipped test is not proof.
  // Deferred criteria never fail: the deferral is declared in the spec.
  return strict ? 1 : 0;
}

// --run: execute every unique cited-and-resolving evidence file through the
// project-declared runner. Declared in .doctrina/verify.json as
//   "evidence_runner": "python -m pytest {file}"
// ({file} is replaced per file). Exit 1 when any run fails (or under --strict
// when nothing is runnable). Deferred specs are skipped like everywhere else.
function runEvidence(projectRoot, reports, strict) {
  const cfgPath = path.join(projectRoot, ".doctrina", "verify.json");
  let runner = null;
  if (isFile(cfgPath)) {
    try { runner = JSON.parse(read(cfgPath))?.evidence_runner ?? null; } catch { runner = null; }
  }
  if (!runner || typeof runner !== "string" || !runner.includes("{file}")) {
    console.error(c.red("error:") + " coverage --run needs an \"evidence_runner\" in .doctrina/verify.json");
    console.error(c.gray("hint: ") + `add e.g. "evidence_runner": "python -m pytest {file}" (the {file} placeholder is required — the CLI never guesses a test runner)`);
    return 1;
  }

  // Unique evidence files: cited by a non-deferred criterion, resolving on
  // disk, and test-shaped (running a cited source artifact proves nothing).
  const files = new Set();
  for (const rep of reports) {
    for (const r of rep.rows) {
      if (rep.deferred || r.kind === "deferred") continue;
      for (const token of r.evidence ?? []) files.add(token);
    }
  }

  if (files.size === 0) {
    console.log(c.gray("no runnable evidence found (no non-deferred criterion cites a resolving test file)"));
    return strict ? 1 : 0;
  }

  console.log(c.bold("coverage --run") + c.gray(` — executing ${files.size} evidence file${files.size === 1 ? "" : "s"} via: ${runner}`));
  let failed = 0;
  for (const file of [...files].sort()) {
    const cmd = runner.replaceAll("{file}", file);
    console.log("");
    console.log(c.gray(`──── ${cmd}`));
    const res = spawnSync(cmd, { cwd: projectRoot, shell: true, stdio: "inherit" });
    const ok = !res.error && res.status === 0;
    console.log(ok ? c.green(`✓ ${file}`) : c.red(`✗ ${file}${res.error ? ` — ${res.error.message}` : ` (exit ${res.status})`}`));
    if (!ok) failed += 1;
  }
  console.log("");
  if (failed === 0) {
    console.log(c.green("ok") + ` ${files.size}/${files.size} evidence runs passed — cited proof actually proves`);
    return 0;
  }
  console.log(c.red("fail") + ` ${files.size - failed}/${files.size} evidence runs passed — a cited proof does not pass`);
  return 1;
}


export const help = `
Usage: doctrina coverage [--strict] [--only <cap,cap>] [--run] [--json]

Report how many acceptance criteria across .doctrina/specs/ cite an
artifact or test that exists on disk. Each numbered criterion may cite
its evidence as a backtick path span, e.g. \`test/quota.test.ts\`.

A criterion is covered when a cited path resolves to real proof,
conditional when its only resolving proof is a test file whose suite is
skipped (\`describe.skip\` / \`xit\` / \`@pytest.mark.skip\` — proves
nothing), dangling when a cited path is missing on disk, and bare when
nothing is cited.

ORCHESTRATION criteria. Citation is the right proof for "this function
behaves" and the wrong one for "the pipeline ran at all": a criterion
like "absence of the report is explicit and the step does not fail" is
satisfied on paper by a job that executed zero cases and printed a
well-written empty state. Mark such a criterion [orchestration] and cite
a verify check by name:

  3. [orchestration] the e2e suite actually executes scenarios —
     verified by \`verify:e2e\`

That check must declare an "expect" guard (see \`doctrina verify --help\`).
A cited check with no guard is reported UNGUARDED and fails --strict: a
check that exits 0 having run nothing would otherwise satisfy the claim.

A spec that declares a deliberate deferral —
\`Implementation: planned — <why>\`, the same escape hatch validate
honours — has its unproven criteria reported as DEFERRED: visible, but
never a --strict failure (declared debt is not hidden debt).

Flags:
  --strict           Exit 1 when any criterion is bare, dangling,
                     conditional, or unguarded (CI gate). Deferred never
                     fails. Without it the command always exits 0 (a report).
  --only <cap,cap>   Scope the report/gate to specific capabilities
                     (\`doctrina close\` uses this so an unrelated deferred
                     spec cannot block a change's close).
  --run              Execute the cited evidence via the project-declared
                     "evidence_runner" in .doctrina/verify.json (a command
                     template with a {file} placeholder, e.g.
                     "python -m pytest {file}"). Exits 1 when any run
                     fails — promotes "the file exists" to "the proof
                     passes". The CLI never guesses a test runner.
  --json             Emit per-spec criterion rows + summary as JSON.
`;

// The capabilities that actually have a spec on disk — the set `--only` is
// checked against, and the list its error prints.
function knownCapabilities(projectRoot) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  if (!isDir(specsDir)) return [];
  return readdirSync(specsDir).filter((e) => isFile(path.join(specsDir, e, "spec.md")));
}

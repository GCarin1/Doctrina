import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { exists, isDir, isFile, read, relPath } from "../lib/fs-ops.js";
import { specHeader } from "../lib/scan.js";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { notADoctrinaProject } from "../lib/exit-codes.js";

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
      console.log(JSON.stringify({ specs: [], summary: { criteria: 0, covered: 0, dangling: 0, conditional: 0, pct: 100 } }, null, 2));
      return 0;
    }
    console.log(c.gray("no acceptance criteria found under .doctrina/specs/"));
    return 0;
  }

  let totalCriteria = 0;
  let totalCovered = 0;
  let totalDangling = 0;
  let totalConditional = 0;
  let totalDeferred = 0;
  for (const rep of reports) {
    totalCriteria += rep.rows.length;
    totalCovered += rep.rows.filter((r) => r.kind === "covered").length;
    totalDangling += rep.rows.filter((r) => r.kind === "dangling").length;
    totalConditional += rep.rows.filter((r) => r.kind === "conditional").length;
    totalDeferred += rep.rows.filter((r) => r.kind === "deferred").length;
  }
  const jsonPct = totalCriteria === 0 ? 100 : Math.round((totalCovered / totalCriteria) * 100);
  // Deferred criteria are visible but never gate: declared debt ≠ hidden debt.
  const jsonClean = totalCovered + totalDeferred === totalCriteria && totalDangling === 0 && totalConditional === 0;

  if (json) {
    console.log(JSON.stringify({
      specs: reports.map((rep) => ({ capability: rep.cap, deferred: rep.deferred, criteria: rep.rows })),
      summary: { criteria: totalCriteria, covered: totalCovered, dangling: totalDangling, conditional: totalConditional, deferred: totalDeferred, pct: jsonPct },
    }, null, 2));
    return jsonClean ? 0 : strict ? 1 : 0;
  }

  console.log(c.bold("Coverage") + c.gray(" — acceptance criteria with linked evidence:"));
  console.log("");

  for (const rep of reports) {
    const covered = rep.rows.filter((r) => r.kind === "covered").length;
    const dangling = rep.rows.filter((r) => r.kind === "dangling").length;
    const conditional = rep.rows.filter((r) => r.kind === "conditional").length;
    const deferredN = rep.rows.filter((r) => r.kind === "deferred").length;

    const notes = [];
    if (conditional > 0) notes.push(c.yellow(`${conditional} conditional`));
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
      } else {
        console.log(`    ${c.yellow("!")} #${r.n}  evidence not found on disk: ${r.missing.map((m) => `\`${m}\``).join(", ")}`);
      }
    }
  }

  const pct = totalCriteria === 0 ? 100 : Math.round((totalCovered / totalCriteria) * 100);
  console.log("");
  const summary = `${totalCovered} of ${totalCriteria} acceptance criteria across ${reports.length} spec${reports.length === 1 ? "" : "s"} have linked evidence (${pct}%)`;
  const clean = totalCovered + totalDeferred === totalCriteria && totalDangling === 0 && totalConditional === 0;
  const extras = [];
  if (totalConditional > 0) extras.push(`${totalConditional} conditional`);
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

// Per-spec criterion rows — the full classification behind both the report
// and the --json output. Each row: { n, kind, missing?, skipped? }.
//
// A spec that declares a deliberate deferral — `Implementation: planned —
// <why>`, the exact escape hatch `validate` already honours — has its
// non-covered criteria remapped to kind "deferred": visible in every report,
// never a --strict failure. Declared debt and hidden debt stop being punished
// identically (0.11.0 field review item 4: one deferred capability poisoned
// the close of every unrelated change).
export function collect(projectRoot, { only = null } = {}) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const reports = [];
  if (isDir(specsDir)) {
    for (const cap of readdirSync(specsDir).sort()) {
      if (only && !only.has(cap)) continue;
      const specPath = path.join(specsDir, cap, "spec.md");
      if (!isFile(specPath)) continue;
      const text = read(specPath);
      const criteria = extractAcceptanceCriteria(text);
      if (criteria.length === 0) continue;
      const deferred = isDeclaredDeferral(text);
      const rows = criteria.map((crit, i) => {
        const row = classify(crit, i + 1, projectRoot, path.dirname(specPath));
        if (deferred && row.kind !== "covered") {
          return { ...row, kind: "deferred", was: row.kind };
        }
        return row;
      });
      reports.push({ cap, specPath, rows, deferred });
    }
  }
  return reports;
}

// The declared-deferral escape hatch, matching validate's two-axis check:
// Implementation is "planned" WITH an explanatory note after the state word.
// A bare "planned" is an inventory claim, not a deferral, and gets no pass.
function isDeclaredDeferral(specText) {
  const implRaw = specHeader(specText, "Implementation");
  if (!implRaw) return false;
  const tokens = implRaw.trim().split(/\s+/);
  const word = (tokens[0] ?? "").replace(/[—-]+$/, "").toLowerCase();
  return word === "planned" && tokens.length > 1;
}

// Pure summary of coverage across the spec tree, for other commands
// (`status`, `review`) that need the numbers without the report output.
// Deferred criteria (declared deferral, see collect) are counted separately
// and excluded from the problem counts, matching the gate semantics.
export function summarize(projectRoot) {
  let totalCriteria = 0, totalCovered = 0, totalDangling = 0, totalConditional = 0, totalDeferred = 0;
  const perCap = [];
  for (const rep of collect(projectRoot)) {
    const covered = rep.rows.filter((r) => r.kind === "covered").length;
    const dangling = rep.rows.filter((r) => r.kind === "dangling").length;
    const conditional = rep.rows.filter((r) => r.kind === "conditional").length;
    const deferred = rep.rows.filter((r) => r.kind === "deferred").length;
    totalCriteria += rep.rows.length;
    totalCovered += covered;
    totalDangling += dangling;
    totalConditional += conditional;
    totalDeferred += deferred;
    perCap.push({ cap: rep.cap, total: rep.rows.length, covered, dangling, conditional, deferred });
  }
  const pct = totalCriteria === 0 ? 100 : Math.round((totalCovered / totalCriteria) * 100);
  return { perCap, totalCriteria, totalCovered, totalDangling, totalConditional, totalDeferred, pct };
}

// Pull the numbered items out of the "## Acceptance criteria" section.
// Each item may span multiple lines (continuation prose); accumulate until
// the next number or the next "## " heading. Returns an array of strings.
function extractAcceptanceCriteria(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inSection = false;
  let buf = null;
  const flush = () => {
    if (buf !== null) out.push(buf.trim());
    buf = null;
  };
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      // Entering or leaving a section.
      if (inSection) {
        flush();
        inSection = false;
      }
      if (/^##\s+Acceptance criteria\b/i.test(line)) inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (/^\s*\d+\.\s+/.test(line)) {
      flush();
      buf = line.replace(/^\s*\d+\.\s+/, "");
    } else if (buf !== null) {
      // Continuation line of the current criterion.
      if (line.trim() === "") buf += " ";
      else buf += " " + line.trim();
    }
  }
  flush();
  // Drop empty placeholder items (a lone "1." with no text).
  return out.filter((s) => s.length > 0);
}

// Decide whether a single criterion is covered, conditional, dangling, or bare.
function classify(criterion, n, projectRoot, specDir) {
  const cited = extractBacktickPaths(criterion);
  if (cited.length === 0) return { kind: "bare", n };
  const missing = [];
  const resolved = [];
  for (const token of cited) {
    const candidates = [
      path.resolve(projectRoot, token),
      path.resolve(specDir, token),
    ];
    const hit = candidates.find(exists);
    if (!hit) {
      missing.push(token);
      continue;
    }
    const isTest = looksLikeTestFile(token);
    const skipped = isTest && isFile(hit) ? testSuiteIsSkipped(read(hit)) : false;
    resolved.push({ token, isTest, skipped });
  }
  if (resolved.length === 0) return { kind: "dangling", n, missing };
  // Runnable evidence: the resolving test-shaped citations, recorded so
  // `coverage --run` can execute them (existence → passing proof).
  const evidence = resolved.filter((r) => r.isTest && !r.skipped).map((r) => r.token);
  // Real proof = a non-test artifact, or a test file whose suite runs. If the
  // only thing that resolves is a skipped test, the criterion is conditional.
  const hasRealProof = resolved.some((r) => !r.isTest || !r.skipped);
  if (hasRealProof) return { kind: "covered", n, evidence };
  return { kind: "conditional", n, skipped: resolved.map((r) => r.token), evidence: [] };
}

// A cited path is a test file when it sits under a tests directory or carries
// a test/spec/e2e filename marker — the only files skip-detection applies to.
function looksLikeTestFile(token) {
  if (/(?:^|\/)(?:tests?|__tests__|specs?|e2e)\//i.test(token)) return true;
  if (/(?:\.|_|-)(?:test|spec|e2e)\.[a-z0-9]+$/i.test(token)) return true;
  if (/(?:^|\/)test_[^/]+\.py$/i.test(token)) return true;
  return false;
}

// Heuristic, dependency-free "is this whole test file gated off?" check: the
// first test construct in the file is a skip/todo (e.g. the Prisma e2e suite
// wrapped in `describe.skip`). A file whose first suite runs is treated as
// real proof even if it has an incidental `it.skip` later — that keeps the
// false-positive rate low without parsing the file. Python skip decorators
// and a module-level `pytest.skip` count too.
function testSuiteIsSkipped(text) {
  const m = text.match(
    /\b(x(?:describe|context|it|test)|(?:describe|context|suite|it|test|specify)\s*\.\s*(?:skip|todo)|(?:describe|context|suite|it|test|specify))\s*\(/,
  );
  if (m) {
    const head = m[1];
    if (/^x/.test(head) || /\.\s*(?:skip|todo)/.test(head)) return true;
  }
  if (/@(?:pytest\.mark\.skip|unittest\.skip)\b/.test(text)) return true;
  if (/^\s*pytest\.skip\s*\(/m.test(text)) return true;
  return false;
}

// Backtick spans that look like repository file paths. Mirrors the
// validate stale-link heuristic: a token is a path if it has a slash or a
// file extension and is not a URL/placeholder.
function extractBacktickPaths(text) {
  const out = new Set();
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const token = m[1].trim();
    if (looksLikePath(token)) out.add(token);
  }
  return [...out];
}

function looksLikePath(s) {
  if (!s) return false;
  if (/^(https?:|mailto:|ftp:|#|@)/i.test(s)) return false;
  if (/[\s<>*?{}]/.test(s)) return false;
  const hasSlash = s.includes("/");
  const hasExt = /\.[a-z0-9]{1,8}$/i.test(s);
  if (!hasSlash && !hasExt) return false;
  if (s.startsWith("-")) return false;
  return true;
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
nothing is cited. A spec that declares a deliberate deferral —
\`Implementation: planned — <why>\`, the same escape hatch validate
honours — has its unproven criteria reported as DEFERRED: visible, but
never a --strict failure (declared debt is not hidden debt).

Flags:
  --strict           Exit 1 when any criterion is bare, dangling, or
                     conditional (CI gate). Deferred never fails. Without
                     it the command always exits 0 (a report).
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

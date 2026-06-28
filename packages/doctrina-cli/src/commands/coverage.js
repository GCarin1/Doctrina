import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";

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

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }
  const strict = flagBool(flags, "strict", false);

  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const reports = [];
  if (isDir(specsDir)) {
    for (const cap of readdirSync(specsDir).sort()) {
      const specPath = path.join(specsDir, cap, "spec.md");
      if (!isFile(specPath)) continue;
      const criteria = extractAcceptanceCriteria(read(specPath));
      if (criteria.length === 0) continue;
      const rows = criteria.map((crit, i) => classify(crit, i + 1, projectRoot, path.dirname(specPath)));
      reports.push({ cap, specPath, rows });
    }
  }

  if (reports.length === 0) {
    console.log(c.gray("no acceptance criteria found under .doctrina/specs/"));
    return 0;
  }

  let totalCriteria = 0;
  let totalCovered = 0;
  let totalDangling = 0;
  let totalConditional = 0;

  console.log(c.bold("Coverage") + c.gray(" — acceptance criteria with linked evidence:"));
  console.log("");

  for (const rep of reports) {
    const covered = rep.rows.filter((r) => r.kind === "covered").length;
    const dangling = rep.rows.filter((r) => r.kind === "dangling").length;
    const conditional = rep.rows.filter((r) => r.kind === "conditional").length;
    totalCriteria += rep.rows.length;
    totalCovered += covered;
    totalDangling += dangling;
    totalConditional += conditional;

    const notes = [];
    if (conditional > 0) notes.push(c.yellow(`${conditional} conditional`));
    if (dangling > 0) notes.push(c.yellow(`${dangling} dangling`));
    const note = notes.length > 0 ? `  (${notes.join(", ")})` : "";
    console.log(`  ${c.cyan(rep.cap.padEnd(20))} ${covered}/${rep.rows.length} criteria${note}`);
    for (const r of rep.rows) {
      if (r.kind === "covered") continue;
      if (r.kind === "bare") {
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
  const clean = totalCovered === totalCriteria && totalDangling === 0 && totalConditional === 0;
  if (clean) {
    console.log(c.green("ok") + " " + summary);
    return 0;
  }
  const extras = [];
  if (totalConditional > 0) extras.push(`${totalConditional} conditional`);
  if (totalDangling > 0) extras.push(`${totalDangling} dangling`);
  const extraSummary = extras.length > 0 ? `, ${extras.join(", ")}` : "";
  console.log((strict ? c.red("fail") : c.yellow("gap")) + " " + summary + extraSummary);
  // A report by default (exit 0); a gate under --strict (exit 1 for CI). A
  // conditional criterion fails the gate too: a skipped test is not proof.
  return strict ? 1 : 0;
}

// Pure summary of coverage across the spec tree, for other commands
// (`status`, `review`) that need the numbers without the report output.
export function summarize(projectRoot) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  let totalCriteria = 0, totalCovered = 0, totalDangling = 0, totalConditional = 0;
  const perCap = [];
  if (isDir(specsDir)) {
    for (const cap of readdirSync(specsDir).sort()) {
      const specPath = path.join(specsDir, cap, "spec.md");
      if (!isFile(specPath)) continue;
      const criteria = extractAcceptanceCriteria(read(specPath));
      if (criteria.length === 0) continue;
      const rows = criteria.map((crit, i) => classify(crit, i + 1, projectRoot, path.dirname(specPath)));
      const covered = rows.filter((r) => r.kind === "covered").length;
      const dangling = rows.filter((r) => r.kind === "dangling").length;
      const conditional = rows.filter((r) => r.kind === "conditional").length;
      totalCriteria += rows.length;
      totalCovered += covered;
      totalDangling += dangling;
      totalConditional += conditional;
      perCap.push({ cap, total: rows.length, covered, dangling, conditional });
    }
  }
  const pct = totalCriteria === 0 ? 100 : Math.round((totalCovered / totalCriteria) * 100);
  return { perCap, totalCriteria, totalCovered, totalDangling, totalConditional, pct };
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
  // Real proof = a non-test artifact, or a test file whose suite runs. If the
  // only thing that resolves is a skipped test, the criterion is conditional.
  const hasRealProof = resolved.some((r) => !r.isTest || !r.skipped);
  if (hasRealProof) return { kind: "covered", n };
  return { kind: "conditional", n, skipped: resolved.map((r) => r.token) };
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
Usage: doctrina coverage [--strict]

Report how many acceptance criteria across .doctrina/specs/ cite an
artifact or test that exists on disk. Each numbered criterion may cite
its evidence as a backtick path span, e.g. \`test/quota.test.ts\`.

A criterion is covered when a cited path resolves to real proof,
conditional when its only resolving proof is a test file whose suite is
skipped (\`describe.skip\` / \`xit\` / \`@pytest.mark.skip\` — proves
nothing), dangling when a cited path is missing on disk, and bare when
nothing is cited. Read-only.

Flags:
  --strict   Exit 1 when any criterion is bare, dangling, or conditional
             (CI gate). Without it the command always exits 0 (a report).
`;

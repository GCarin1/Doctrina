// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read } from "./fs-ops.js";
import { specHeader } from "./scan.js";

// The coverage MODEL: how a spec's acceptance criteria are classified, what
// the tree's coverage adds up to, and the implementation state that
// arithmetic supports.
//
// It lives in lib/ rather than in `commands/coverage.js` because five other
// surfaces need these numbers — `status`, `review`, `validate`, `close` and
// `spec set --implementation auto` — and a command module is a RENDERER, not
// a place other commands reach into for data (audit finding F7). Before this
// split, six command modules imported functions out of each other's files;
// a test now forbids the pattern outright.
//
// Nothing here prints, and nothing here writes.

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
    const unguarded = rep.rows.filter((r) => r.kind === "unguarded").length;
    const deferred = rep.rows.filter((r) => r.kind === "deferred").length;
    totalCriteria += rep.rows.length;
    totalCovered += covered;
    totalDangling += dangling;
    totalConditional += conditional;
    totalDeferred += deferred;
    perCap.push({ cap: rep.cap, total: rep.rows.length, covered, dangling, conditional, unguarded, deferred });
  }
  // Absence is not approval (change 0057). Zero criteria used to project to
  // 100%, so the first number a new project read about itself was a perfect
  // score over nothing — and `doctor`, reading this same collection, warned.
  // `null` is the honest value: there is no ratio, and every view renders
  // that as "no criteria declared" the way trace already renders no anchors.
  const pct = totalCriteria === 0 ? null : Math.round((totalCovered / totalCriteria) * 100);
  return { perCap, totalCriteria, totalCovered, totalDangling, totalConditional, totalDeferred, pct };
}

// ---------------------------------------------------------------------------
// The derived Implementation state (audit finding F10)
// ---------------------------------------------------------------------------
//
// `**Implementation:**` was maintained from memory, and the `work` playbook
// asked the agent TWICE to advance a field whose correct value was already
// computed in the file next door: coverage knows, per spec, how many criteria
// cite proof that resolves — which is what "verified" means.
//
// So the value is derived, and only PROPOSED. Nothing here rewrites a header:
// `close` prints the `set-header` op, `validate` warns when the written value
// contradicts the arithmetic, and `spec set --implementation auto` applies it
// when a human or agent asks for it. A gate that silently edited the claim it
// is checking would be marking its own homework.
//
// "Resolves on disk" is the bar, not "was executed": `coverage --run` is the
// opt-in that runs the proof, and making a structural read depend on a test
// run would put a test suite inside `validate`. A criterion whose only proof
// is a skipped suite is already `conditional`, so it never counts as covered.

/**
 * The Implementation state a spec's coverage supports.
 *
 *   verified  every criterion is covered — no dangling, conditional or
 *             unguarded row, and at least one criterion exists.
 *   partial   at least one criterion is covered, but not all.
 *   planned   none is.
 *
 * A spec with no acceptance criteria has nothing to derive from, so it
 * returns null and every surface stays quiet about it.
 *
 * @returns {"verified"|"implemented"|"partial"|"planned"|null}
 */
export function deriveImplementation(row) {
  if (!row || row.total === 0) return null;
  const problems = row.dangling + row.conditional + row.unguarded + row.deferred;
  if (row.covered === row.total && problems === 0) {
    // Every proof resolves — but a criterion the author still marks
    // [unverified] is linked, not certified (change 0105). The ladder's
    // rung for "the code is there; I have not certified it" is
    // `implemented`, and the arithmetic may not climb past the mark.
    return (row.unverified ?? 0) > 0 ? "implemented" : "verified";
  }
  return row.covered > 0 ? "partial" : "planned";
}

/**
 * The derived state per capability, keyed by capability name — the one
 * arithmetic `validate`, `close` and `spec set --implementation auto` all
 * read, so the three can never propose different values.
 *
 * @returns {Map<string, {derived: string, covered: number, total: number, deferred: boolean, unverified: number}>}
 */
export function derivedImplementations(projectRoot, { only = null } = {}) {
  const out = new Map();
  for (const rep of collect(projectRoot, { only })) {
    const row = {
      total: rep.rows.length,
      covered: rep.rows.filter((r) => r.kind === "covered").length,
      dangling: rep.rows.filter((r) => r.kind === "dangling").length,
      conditional: rep.rows.filter((r) => r.kind === "conditional").length,
      unguarded: rep.rows.filter((r) => r.kind === "unguarded").length,
      deferred: rep.rows.filter((r) => r.kind === "deferred").length,
      unverified: rep.rows.filter((r) => r.kind === "covered" && r.unverified).length,
    };
    const derived = deriveImplementation(row);
    if (derived) out.set(rep.cap, { derived, covered: row.covered, total: row.total, deferred: rep.deferred, unverified: row.unverified });
  }
  return out;
}

/**
 * Whether a written Implementation header contradicts what coverage supports,
 * and the op that would settle it.
 *
 * Two exemptions, both deliberate:
 *
 *  1. A state carrying a NOTE (`planned — backend deferred, see ADR 0007`).
 *     That is the declared-deferral escape hatch the coverage gate already
 *     honours, generalised: a note is where a human explains why the
 *     arithmetic is not the whole story, and prose written on purpose is not
 *     overruled by a count.
 *  2. `implemented` where the arithmetic supports `verified`. The ladder is
 *     planned -> partial -> implemented -> verified, and `implemented` is the
 *     rung that says "the code is there; I have not certified it". Understating
 *     by exactly that rung is the ladder working, not a stale header.
 *
 * Everything else that disagrees is reported — in BOTH directions. Claiming
 * `verified` with half the criteria bare is the obvious dishonesty; leaving
 * `planned` on a fully proven capability is the one that actually happens,
 * and it makes every reader distrust the field.
 */
export function implementationMismatch(written, derived) {
  if (!derived) return null;
  const raw = (written ?? "").trim();
  if (!raw) return { written: null, derived, op: `set-header Implementation: ${derived}` };
  const tokens = raw.split(/\s+/);
  const word = (tokens[0] ?? "").replace(/[—-]+$/, "").toLowerCase();
  if (tokens.length > 1) return null;
  if (word === derived) return null;
  if (word === "implemented" && derived === "verified") return null;
  return { written: word, derived, op: `set-header Implementation: ${derived}` };
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

// ORCHESTRATION criteria (change 0029). Coverage measures CITATION: a
// criterion is covered when it cites a file that exists (and, since G3, a
// test whose suite is not skipped). That is the right test for "this
// function behaves", and the wrong one for "the pipeline ran at all".
//
// A criterion like "absence of the report is explicit and the step does not
// fail" is satisfied, on paper, by a job that executed zero cases and
// printed a well-written empty state — the citation resolves, the suite is
// not skipped, and the only visible signal is a tidy message saying nothing
// happened. Coverage calls that proven.
//
// Marking a criterion `[orchestration]` says: the claim is that a RUN
// happened, so the proof must be a fail-closed one. It cites a verify check
// by name (`verify:<check>`), and that check must declare an `expect` guard
// — the thing that turns "exit 0" into "exit 0 having actually done
// something". A named check without a guard is UNGUARDED: the criterion is
// not proven, and says so, instead of quietly counting as covered.
const ORCHESTRATION_MARKER = /^orchestration\b/;

function citedVerifyChecks(criterion) {
  const out = new Set();
  for (const m of criterion.matchAll(/`verify:([A-Za-z0-9_.-]+)`/g)) out.add(m[1]);
  return [...out];
}

function guardedVerifyChecks(projectRoot) {
  const configPath = path.join(projectRoot, ".doctrina", "verify.json");
  if (!isFile(configPath)) return null;
  let config;
  try {
    config = JSON.parse(read(configPath));
  } catch {
    return null;
  }
  const map = new Map();
  for (const ch of Array.isArray(config?.checks) ? config.checks : []) {
    if (!ch?.name) continue;
    const exp = ch.expect;
    const guarded = Boolean(exp && typeof exp === "object"
      && (typeof exp.fail_if_output_matches === "string" || typeof exp.require_output_matches === "string"));
    map.set(ch.name, guarded);
  }
  return map;
}

function classifyOrchestration(criterion, n, projectRoot) {
  const named = citedVerifyChecks(criterion);
  if (named.length === 0) {
    return { kind: "unguarded", n, reason: "cites no verify check — an orchestration claim is proven by a fail-closed check, cited as `verify:<check>`" };
  }
  const checks = guardedVerifyChecks(projectRoot);
  if (checks === null) {
    return { kind: "dangling", n, missing: named.map((x) => `verify:${x}`) };
  }
  const unknown = named.filter((x) => !checks.has(x));
  if (unknown.length > 0) {
    return { kind: "dangling", n, missing: unknown.map((x) => `verify:${x}`) };
  }
  const unguarded = named.filter((x) => !checks.get(x));
  if (unguarded.length > 0) {
    return {
      kind: "unguarded",
      n,
      reason: `verify check${unguarded.length === 1 ? "" : "s"} ${unguarded.join(", ")} declare${unguarded.length === 1 ? "s" : ""} no "expect" guard — a check that exits 0 having run nothing would still pass it`,
    };
  }
  return { kind: "covered", n, evidence: [] };
}

// Decide whether a single criterion is covered, conditional, dangling, or bare.
function classify(criterion, n, projectRoot, specDir) {
  // An orchestration criterion is judged on its GUARD, not on whether a
  // cited file exists — the whole point is that existence proves nothing here.
  const marker = criterion.match(/^\[([^\]]+)\]/)?.[1]?.toLowerCase() ?? "";
  if (ORCHESTRATION_MARKER.test(marker)) {
    return classifyOrchestration(criterion, n, projectRoot);
  }

  const cited = extractBacktickPaths(criterion);
  if (cited.length === 0) return { kind: "bare", n };
  const missing = [];
  const resolved = [];
  // The author's own mark, carried on the row (change 0105): a criterion
  // marked [unverified] whose proof resolves is evidence LINKED, not a
  // certification — the mark is flipped when the test proves it, and until
  // then the derived Implementation may not read "verified" off it.
  const unverified = /^unverified\b/.test(marker);
  // Proof lives in the project (change 0106). `path.resolve` happily
  // followed `../other/app.py` and `C:/Windows/notepad.exe` out of the tree,
  // and `exists` accepted a directory — `tests/` — as the file that proves a
  // claim. A path outside the root, or a directory, is not evidence: it is
  // reported as missing with the reason, and the criterion is not covered
  // by it.
  const root = path.resolve(projectRoot);
  const inside = (abs) => abs === root || abs.startsWith(root + path.sep);
  // Directories and bare names cited next to a resolving proof are prose
  // MENTIONS ("every file under `src/`"), not claims of evidence; they are
  // not reported on a covered row. Alone, they leave the criterion dangling.
  const mentions = [];
  for (const token of cited) {
    const candidates = path.isAbsolute(token)
      ? [path.resolve(token)]
      : [path.resolve(projectRoot, token), path.resolve(specDir, token)];
    const hit = candidates.find(exists);
    if (!hit) {
      missing.push(token);
      continue;
    }
    if (!inside(hit)) {
      missing.push(`${token} (outside the project)`);
      continue;
    }
    if (!isFile(hit)) {
      missing.push(`${token} (a directory, not a file)`);
      mentions.push(token);
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
  // `missing` rides along on a covered row: one citation resolving does
  // not make the other one true, and the report names it (change 0106).
  if (hasRealProof) {
    const claims = missing.filter((m) =>
      !mentions.some((d) => m.startsWith(`${d} `)) && /[\\/]/.test(m) && !/[\\/]$/.test(m));
    return { kind: "covered", n, evidence, unverified, missing: claims };
  }
  return { kind: "conditional", n, skipped: resolved.map((r) => r.token), evidence: [], unverified, missing };
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
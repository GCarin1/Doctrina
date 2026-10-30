// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, walk } from "./fs-ops.js";
import { projectName } from "./project.js";
import * as idx from "./index-json.js";
import { deriveIndex, indexesMatch, specHeader, listHeader, deltaCapabilities } from "./scan.js";
import { cliVersion } from "./version.js";
import { summarize as coverageSummary } from "./coverage-model.js";
import { summarize as traceSummary } from "./trace-model.js";
import { acceptedDecisions, productSection, hasProductSection } from "./constitution-model.js";
import { computeActions } from "./actions.js";
import { readLedger } from "./ledger.js";
import { parseChangeTitle, checklistProgress } from "./doc-model.js";
import { summarizeSignoffs } from "./signoff.js";
import { gitWindow, historyState, windowCutoff } from "./git.js";
import { collectMetrics } from "./metrics-model.js";
import { today } from "./dates.js";

// ONE collector, several views (audit finding F7).
//
// `status`, `prime`, `handoff` and `report` were four commands rendering the
// same three collections, and they got at them by importing functions out of
// each other's modules: `prime` reached into `status` for `collectStatus`,
// `handoff` and `report` reached into `prime` for `openChanges`, and all
// three reached into `coverage` and `trace` for their summaries. Every one of
// those is a command module — a RENDERER — being used as a data source, which
// is how four surfaces end up able to disagree about the same number.
//
// So the project's state is collected ONCE, here, into a plain object. The
// four commands become formatters over it: same numbers, four shapes, and a
// new view costs a function rather than a fifth traversal of the tree.
//
// Nothing here prints and nothing here writes.

const VERIFY_CONFIG_REL = ".doctrina/verify.json";

/**
 * Everything the read-only views report, collected in one pass.
 *
 * `actions` is included because three of the four views end with "what next",
 * and computing it separately in each was the same duplication one level up.
 */
export function collectSnapshot(projectRoot, { actions = true } = {}) {
  let index = null;
  try {
    index = idx.load(projectRoot);
  } catch {
    index = null;
  }
  let indexState = "missing";
  if (index) {
    indexState = indexesMatch(deriveIndex(projectRoot, index), index) ? "in-sync" : "drifted";
  }

  // Collected once, then shared: the views render it and `computeActions`
  // recommends from it, so a recommendation can never disagree with the row
  // it comes from (change 0037, extended to `next` by change 0064).
  const coverage = coverageSummary(projectRoot);
  const trace = traceSummary(projectRoot);
  const verify = readVerifyConfig(projectRoot);

  return {
    project: projectName(projectRoot, index),
    stamp: index?.framework_version ?? null,
    cli: cliVersion(),
    indexState,
    coverage,
    trace,
    verify,
    specs: countSpecs(projectRoot),
    decisions: countDecisions(projectRoot),
    skills: countSkills(projectRoot),
    openChanges: openChanges(projectRoot),
    recentlyClosed: recentlyClosed(projectRoot),
    adrs: acceptedDecisions(projectRoot),
    nonGoals: productSection(projectRoot, "Non-goals"),
    hasNonGoalsSection: hasProductSection(projectRoot, "Non-goals"),
    // The gate state is already collected above; hand it over so the whole
    // snapshot stays one read of the tree (change 0037).
    actions: actions ? computeActions(projectRoot, { coverage, trace, verify }) : [],
    archive: index?.artifacts?.changes_archive ?? [],
    // The lane each open change was born in, for the report's mix. Read from
    // the index rather than re-parsed, so one derivation owns the field.
    openLanes: (index?.artifacts?.changes ?? []).map((c) => c.lane ?? null),
    // The archive ledger, parsed (change 0046). The index records WHICH
    // changes landed; the ledger records what each one touched and when, in
    // one append-only file — which is what a question like "how often has
    // this capability moved?" is actually asking about.
    ledger: readLedger(projectRoot).entries,
  };
}

/**
 * The subset `status --json`, `doctor` and the dashboard have always
 * published. Kept as its own shape so the JSON envelope does not silently
 * grow the day a view needs one more field.
 */
export function collectStatus(projectRoot) {
  const s = collectSnapshot(projectRoot, { actions: false });
  return {
    project: s.project,
    stamp: s.stamp,
    cli: s.cli,
    indexState: s.indexState,
    coverage: s.coverage,
    trace: s.trace,
    verify: s.verify,
    specs: s.specs,
    decisions: s.decisions,
    skills: s.skills,
  };
}

function readVerifyConfig(projectRoot) {
  const p = path.join(projectRoot, VERIFY_CONFIG_REL);
  if (!isFile(p)) return { configured: false, checks: 0, invalid: false, signoffs: null };
  try {
    const cfg = JSON.parse(read(p));
    const checks = Array.isArray(cfg?.checks) ? cfg.checks : [];
    // Executed proof and SIGNED proof are different claims (change 0039), and
    // a report that adds them together hides which is which. The counts ride
    // along so every view can say so without loading the sign-off store
    // itself.
    const signoffs = summarizeSignoffs(projectRoot, checks);
    return { configured: true, checks: checks.length, invalid: false, signoffs };
  } catch {
    return { configured: true, checks: 0, invalid: true, signoffs: null };
  }
}

/** Open changes with their proposal status/title and task progress. */
export function openChanges(projectRoot) {
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  const out = [];
  if (!isDir(changesDir)) return out;
  for (const id of readdirSync(changesDir).sort()) {
    if (id === "archive" || id.startsWith(".")) continue;
    if (!isDir(path.join(changesDir, id))) continue;
    const proposalPath = path.join(changesDir, id, "proposal.md");
    const proposal = isFile(proposalPath) ? read(proposalPath) : null;
    const title = proposal ? parseChangeTitle(proposal) : null;
    const status = proposal ? (listHeader(proposal, "Status") ?? "proposed") : "no proposal.md";
    const tasksPath = path.join(changesDir, id, "tasks.md");
    // One counter for every surface (change 0067). This one used to require
    // TEXT after the box, so the scaffold's empty placeholders were invisible
    // and `prime` reported "tasks 0/3" for a change with six open boxes.
    const progress = isFile(tasksPath)
      ? checklistProgress(read(tasksPath))
      : { total: 0, done: 0, open: [], placeholders: 0 };
    const tasksTotal = progress.total;
    const tasksDone = progress.done;
    const unchecked = progress.open.map((t) => t || "(unwritten task — the scaffold's placeholder)");
    const date = proposal ? (listHeader(proposal, "Date") ?? null) : null;
    // The capabilities its deltas target — what `prime` turns into the
    // exact read command for the change (change 0217).
    const capabilities = deltaCapabilities(path.join(changesDir, id));
    out.push({ id, title, status, tasksDone, tasksTotal, unchecked, date, ageDays: ageInDays(date), capabilities });
  }
  return out;
}

// How far back `prime` and the pulse look for closed changes (change 0214).
export const RECENT_CLOSE_DAYS = 7;

/**
 * Changes archived in the last RECENT_CLOSE_DAYS, newest first: what the
 * human may ask for again without knowing it is done. A field review: the
 * close moved the work to `changes/archive/`, out of every default read, and
 * the next request was to "create the doctrina work" for it.
 *
 * @param {string} projectRoot
 * @param {{ limit?: number }} [opts]
 * @returns {Array<{ id: string, title: string|null, date: string, path: string, ageDays: number|null }>}
 */
export function recentlyClosed(projectRoot, { limit = 3 } = {}) {
  const archiveDir = path.join(projectRoot, ".doctrina", "changes", "archive");
  if (!isDir(archiveDir)) return [];
  const out = [];
  for (const name of readdirSync(archiveDir).sort().reverse()) {
    const m = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    if (!m || !isDir(path.join(archiveDir, name))) continue;
    const ageDays = ageInDays(m[1]);
    if (ageDays === null || ageDays > RECENT_CLOSE_DAYS) break;
    const proposal = path.join(archiveDir, name, "proposal.md");
    out.push({
      id: m[2], date: m[1], ageDays,
      title: isFile(proposal) ? parseChangeTitle(read(proposal)) : null,
      path: `.doctrina/changes/archive/${name}/`,
    });
    if (out.length >= limit) break;
  }
  return out;
}

// How old a change has to be before "still open" is worth saying on its own.
export const STALE_CHANGE_DAYS = 7;

/**
 * The open changes worth a line at the end of someone else's close (change
 * 0201): a change that LOOKS finished — applied, or every task ticked — and
 * was never closed, and a change open for a week or more. A field review of
 * 0.17 found change 0078 shipped and left open, and no later close said so:
 * the close is the moment someone is looking, so it is where to say it.
 *
 * @param {string} projectRoot
 * @param {{ exclude?: string[] }} [opts]
 */
export function unfinishedChanges(projectRoot, { exclude = [] } = {}) {
  const skip = new Set(exclude);
  const out = [];
  for (const ch of openChanges(projectRoot)) {
    if (skip.has(ch.id)) continue;
    const finished = ch.status === "applied" ||
      (ch.tasksTotal > 0 && ch.tasksDone === ch.tasksTotal);
    const old = ch.ageDays !== null && ch.ageDays >= STALE_CHANGE_DAYS;
    const reason = ch.status === "applied"
      ? "applied but never closed"
      : finished ? "every task ticked, never closed" : old ? "still open" : null;
    out.push({ ...ch, finished, old, reason });
  }
  return out;
}

function ageInDays(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const ms = Date.parse(`${today()}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86400000)) : null;
}

function countSpecs(projectRoot) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const impl = {};
  let total = 0;
  if (isDir(specsDir)) {
    for (const cap of readdirSync(specsDir).sort()) {
      const p = path.join(specsDir, cap, "spec.md");
      if (!isFile(p)) continue;
      total += 1;
      const implRaw = specHeader(read(p), "Implementation");
      if (implRaw) {
        const word = implRaw.trim().split(/[\s—-]+/)[0].toLowerCase();
        impl[word] = (impl[word] ?? 0) + 1;
      }
    }
  }
  const changesDir = path.join(projectRoot, ".doctrina", "changes");
  let open = 0;
  if (isDir(changesDir)) {
    for (const e of readdirSync(changesDir)) {
      if (e === "archive" || e.startsWith(".")) continue;
      if (isDir(path.join(changesDir, e))) open += 1;
    }
  }
  return { total, impl, openChanges: open };
}

function countDecisions(projectRoot) {
  const adrDir = path.join(projectRoot, ".doctrina", "decisions");
  let total = 0, proposed = 0, bare = 0;
  const isBare = (v) => {
    const t = (v ?? "").trim();
    return t === "" || t === "—" || t === "-";
  };
  if (isDir(adrDir)) {
    for (const f of walk(adrDir)) {
      if (!/^\d{4}-.+\.md$/.test(path.basename(f))) continue;
      total += 1;
      const text = read(f);
      const status = (listHeader(text, "Status") ?? "").toLowerCase();
      if (status === "proposed") proposed += 1;
      if (status === "accepted") {
        const evidence = listHeader(text, "Evidence");
        const landed = listHeader(text, "Landed");
        if (evidence !== null && isBare(evidence) && isBare(landed)) bare += 1;
      }
    }
  }
  return { total, proposed, bare };
}

function countSkills(projectRoot) {
  const skillsDir = path.join(projectRoot, ".doctrina", "skills");
  if (!isDir(skillsDir)) return 0;
  return walk(skillsDir).filter((f) => f.endsWith(".md")).length;
}

/**
 * Everything the period digest reads beyond the snapshot, for a window of
 * `days`. ONE collector for every door that renders the digest: `report`
 * passed the metrics and `status --view report` did not, so the view that
 * promised "never different numbers" printed two lines fewer (change 0176).
 *
 * @param {string} projectRoot
 * @param {number} days
 */
export function collectReportWindow(projectRoot, days) {
  return {
    days,
    cutoffIso: windowCutoff(days),
    git: gitWindow(projectRoot, days),
    gitState: historyState(projectRoot),
    metrics: collectMetrics(projectRoot, `${days} days ago`),
  };
}

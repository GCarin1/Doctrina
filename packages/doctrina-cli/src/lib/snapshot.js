// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, walk } from "./fs-ops.js";
import * as idx from "./index-json.js";
import { deriveIndex, indexesMatch, specHeader, listHeader } from "./scan.js";
import { cliVersion } from "./version.js";
import { summarize as coverageSummary } from "./coverage-model.js";
import { summarize as traceSummary } from "./trace-model.js";
import { acceptedDecisions, productSection } from "./constitution-model.js";
import { computeActions } from "./actions.js";
import { readLedger } from "./ledger.js";
import { parseChangeTitle } from "./doc-model.js";
import { summarizeSignoffs } from "./signoff.js";

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

  return {
    project: index?.project ?? path.basename(projectRoot),
    stamp: index?.framework_version ?? null,
    cli: cliVersion(),
    indexState,
    coverage: coverageSummary(projectRoot),
    trace: traceSummary(projectRoot),
    verify: readVerifyConfig(projectRoot),
    specs: countSpecs(projectRoot),
    decisions: countDecisions(projectRoot),
    skills: countSkills(projectRoot),
    openChanges: openChanges(projectRoot),
    adrs: acceptedDecisions(projectRoot),
    nonGoals: productSection(projectRoot, "Non-goals"),
    actions: actions ? computeActions(projectRoot) : [],
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
    let tasksDone = 0, tasksTotal = 0;
    const unchecked = [];
    if (isFile(tasksPath)) {
      for (const line of read(tasksPath).split(/\r?\n/)) {
        const m = line.match(/^-\s+\[([ xX])\]\s+(.*)$/);
        if (!m) continue;
        tasksTotal += 1;
        if (m[1] === " ") unchecked.push(m[2].trim());
        else tasksDone += 1;
      }
    }
    out.push({ id, title, status, tasksDone, tasksTotal, unchecked });
  }
  return out;
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

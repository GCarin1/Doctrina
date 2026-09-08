// @ts-check
import { c } from "./colors.js";
import { today } from "./dates.js";
import { churnByCapability } from "./ledger.js";

// Executed proof and signed proof are different claims (change 0039). One
// phrasing, used by every view, so none of them can quietly add the two
// together and call the total green.
function signoffNote(verify, { verbose = false } = {}) {
  const s = verify.signoffs;
  if (!s || s.manual === 0) return "";
  const stale = s.expired + s.unverifiable + s.pending;
  if (stale === 0) return verbose ? ` (${s.manual} signed, all current)` : ` · ${s.manual} signed`;
  const parts = [];
  if (s.expired) parts.push(`${s.expired} expired`);
  if (s.unverifiable) parts.push(`${s.unverifiable} unverifiable`);
  if (s.pending) parts.push(`${s.pending} unsigned`);
  return ` (${s.manual} signed, ${parts.join(", ")})`;
}

// The four VIEWS of one snapshot (audit finding F7).
//
// `status`, `prime`, `handoff` and `report` differ only in shape: a
// dashboard, a session primer, a Markdown resume note, a period digest. They
// were four commands, each re-collecting the tree and reaching into the
// others' modules for the parts it did not collect itself.
//
// Each function below takes the snapshot lib/snapshot.js already produced and
// returns lines. They are pure: no reads, no writes, no process exits — which
// is what makes "the four views agree" a property of the code rather than a
// promise, and what lets `doctrina status --view <name>` render any of them.

export const VIEWS = ["dashboard", "prime", "handoff", "report", "rules"];

// Count the recorded lanes, keeping "unknown" as its own row rather than
// dropping it: a mix that silently omits the changes it could not classify
// reports a cleaner project than the one that exists.
function laneMix(records) {
  const counts = new Map();
  let overridden = 0;
  let total = 0;
  for (const raw of records) {
    total += 1;
    if (!raw) {
      counts.set("unknown", (counts.get("unknown") ?? 0) + 1);
      continue;
    }
    const lane = String(raw).split(/[\s(]/)[0] || "unknown";
    counts.set(lane, (counts.get(lane) ?? 0) + 1);
    if (/opened as|opened anyway/.test(raw)) overridden += 1;
  }
  return { total, overridden, rows: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
}

/** Render one named view. Unknown names are a caller error, not a fallback. */
// One rendering of the coverage ratio, shared by every view (change 0037
// unified the collector; this is the same argument for the label). A pct of
// null means no criterion was declared — there is nothing to be a ratio OF,
// so the views say so instead of printing a score. `trace` has always said
// "no anchors declared" for its own empty case; coverage now matches it.
export function coverageLabel(cov) {
  if (cov.pct === null) return `no criteria declared (0/0)`;
  return `${cov.pct}% (${cov.totalCovered}/${cov.totalCriteria} criteria)`;
}

export function renderView(name, snapshot, options = {}) {
  switch (name) {
    case "dashboard": return dashboard(snapshot);
    case "prime": return prime(snapshot);
    case "handoff": return handoff(snapshot);
    case "report": return report(snapshot, options);
    case "rules": return rules(snapshot);
    default: throw new Error(`unknown view "${name}" (declared: ${VIEWS.join(", ")})`);
  }
}

// --------------------------------------------------------------- dashboard

export function dashboard(s) {
  const out = [];
  out.push(c.bold("Doctrina status") + c.gray(` — ${s.project}  (framework ${s.stamp ?? "—"} / CLI ${s.cli})`));
  out.push("");

  out.push(c.bold("  Gates"));
  let driftLine;
  if (s.indexState === "missing") {
    driftLine = c.red("missing/unreadable") + c.gray(" — run `doctrina index rebuild`");
  } else if (s.indexState === "in-sync") {
    driftLine = c.green("in sync");
  } else {
    driftLine = c.yellow("drifted") + c.gray(" — run `doctrina validate --fix`");
  }
  out.push(`    ${"index".padEnd(11)} ${driftLine}`);

  const stampLine = s.stamp === s.cli
    ? c.green("current")
    : c.yellow(`${s.stamp ?? "—"} (CLI ${s.cli})`) + c.gray(" — `doctrina index rebuild`");
  out.push(`    ${"stamp".padEnd(11)} ${stampLine}`);

  const cov = s.coverage;
  const covExtra = cov.totalDangling + cov.totalConditional > 0
    ? c.yellow(` ${cov.totalDangling} dangling, ${cov.totalConditional} conditional`)
    : "";
  if (cov.pct === null) {
    out.push(`    ${"coverage".padEnd(11)} ${c.yellow("no criteria declared")} ${c.gray("(0/0)")}`);
  } else {
    const covColor = cov.pct === 100 ? c.green : cov.pct >= 50 ? c.yellow : c.red;
    out.push(`    ${"coverage".padEnd(11)} ${covColor(`${cov.pct}%`)} ${c.gray(`(${cov.totalCovered}/${cov.totalCriteria} criteria)`)}${covExtra}`);
  }

  const tr = s.trace;
  const trExtra = tr.untraceable + tr.dropped + tr.dangling > 0
    ? c.yellow(` ${tr.dropped} dropped, ${tr.untraceable} untraceable`)
    : "";
  const trColor = tr.anchors === 0 ? c.gray : (tr.realized === tr.anchors && tr.untraceable === 0 ? c.green : c.yellow);
  const trText = tr.anchors === 0 ? "no anchors" : `${tr.realized}/${tr.anchors} anchors`;
  out.push(`    ${"trace".padEnd(11)} ${trColor(trText)}${trExtra}`);

  let verifyLine = c.gray("not configured") + c.gray(" — `doctrina verify --init`");
  if (s.verify.invalid) {
    verifyLine = c.red("invalid JSON");
  } else if (s.verify.configured) {
    const n = s.verify.checks;
    const stale = s.verify.signoffs
      ? s.verify.signoffs.expired + s.verify.signoffs.unverifiable + s.verify.signoffs.pending
      : 0;
    verifyLine = c.cyan(`${n} check${n === 1 ? "" : "s"}`) +
      (stale > 0 ? c.yellow(signoffNote(s.verify)) : c.gray(signoffNote(s.verify))) +
      c.gray(" — run `doctrina verify`");
  }
  out.push(`    ${"verify".padEnd(11)} ${verifyLine}`);

  out.push("");
  out.push(c.bold("  Work"));
  const implBreak = Object.entries(s.specs.impl).map(([k, v]) => `${v} ${k}`).join(", ");
  out.push(`    ${"specs".padEnd(11)} ${s.specs.total}${implBreak ? c.gray(`  (${implBreak})`) : ""}`);
  out.push(`    ${"changes".padEnd(11)} ${s.specs.openChanges} open`);
  const adrNotes = [];
  if (s.decisions.proposed > 0) adrNotes.push(c.yellow(`${s.decisions.proposed} proposed`));
  if (s.decisions.bare > 0) adrNotes.push(c.yellow(`${s.decisions.bare} unproven`));
  out.push(`    ${"decisions".padEnd(11)} ${s.decisions.total}${adrNotes.length ? c.gray("  (") + adrNotes.join(c.gray(", ")) + c.gray(")") : ""}`);
  out.push(`    ${"skills".padEnd(11)} ${s.skills}`);

  out.push("");
  out.push(c.gray("  Full gates: `doctrina validate` · `doctrina verify`.  Next step: `doctrina next`."));
  return out;
}

// ------------------------------------------------------------------- prime

export function prime(s) {
  const out = [];
  out.push(c.bold("Doctrina prime") + c.gray(` — ${s.project}  (framework ${s.stamp ?? "—"} / CLI ${s.cli})`));
  out.push("");

  const cov = s.coverage.pct === null
    ? "no criteria declared"
    : `${s.coverage.pct}% (${s.coverage.totalCovered}/${s.coverage.totalCriteria})`;
  const tr = s.trace.anchors === 0 ? "no anchors" : `${s.trace.realized}/${s.trace.anchors}`;
  const verify = s.verify.configured
    ? `${s.verify.checks} verify checks${signoffNote(s.verify)}`
    : "verify not configured";
  out.push(c.bold("Gates  ") + `index ${s.indexState} · coverage ${cov} · trace ${tr} · ${verify}`);
  const implBreak = Object.entries(s.specs.impl).map(([k, v]) => `${v} ${k}`).join(", ");
  out.push(
    c.bold("Work   ") +
      `${s.specs.total} specs${implBreak ? ` (${implBreak})` : ""} · ${s.specs.openChanges} open change${s.specs.openChanges === 1 ? "" : "s"} · ` +
      `${s.decisions.total} decisions · ${s.skills} skills`,
  );

  out.push("");
  out.push(c.bold("Rules") + c.gray(`  (${s.adrs.length} accepted ADRs — \`doctrina prime --rules\` for detail)`));
  for (const a of s.adrs) out.push(`  ${c.cyan(a.id)}  ${a.title}`);
  if (s.nonGoals.length > 0) {
    out.push(c.gray(`  + ${s.nonGoals.length} non-goal${s.nonGoals.length === 1 ? "" : "s"} declared in product.md`));
  }

  out.push("");
  out.push(c.bold("Open work"));
  if (s.openChanges.length === 0) {
    out.push(c.gray("  none — `doctrina work \"<prompt>\"` opens the next change"));
  } else {
    for (const ch of s.openChanges) {
      const tasks = ch.tasksTotal > 0 ? ` · tasks ${ch.tasksDone}/${ch.tasksTotal}` : "";
      out.push(`  ${c.cyan(ch.id)}  ${ch.title ?? ""}${c.gray(` (${ch.status}${tasks})`)}`);
    }
  }

  out.push("");
  out.push(c.bold("Next"));
  if (s.actions.length === 0) {
    out.push(c.gray("  nothing pending — pick up new work"));
  } else {
    s.actions.slice(0, 5).forEach((a, i) => out.push(`  ${i + 1}. ${a.text}`));
    if (s.actions.length > 5) out.push(c.gray(`  … ${s.actions.length - 5} more — \`doctrina next\``));
  }

  out.push("");
  out.push(c.gray("Read deeper: `doctrina context [<cap>] --concat` · `doctrina why <cap>` · `doctrina show <ref>`"));
  return out;
}

// ----------------------------------------------------------------- handoff

export function handoff(s) {
  const out = [];
  out.push(`# Doctrina handoff — ${s.project} (${today()})`);
  out.push("");

  out.push("## Where things stand");
  out.push("");
  out.push(`- index: ${s.indexState} · framework stamp: ${s.stamp ?? "—"} (CLI ${s.cli})`);
  out.push(`- coverage: ${coverageLabel(s.coverage)}` +
    (s.coverage.totalDangling ? `, ${s.coverage.totalDangling} dangling` : "") +
    (s.coverage.totalConditional ? `, ${s.coverage.totalConditional} conditional` : ""));
  const tr = s.trace.anchors === 0 ? "no anchors declared" : `${s.trace.realized}/${s.trace.anchors} anchors realized`;
  out.push(`- trace: ${tr}` + (s.trace.untraceable ? ` (${s.trace.untraceable} untraceable)` : ""));
  out.push(`- verify: ${s.verify.configured ? `${s.verify.checks} checks declared${signoffNote(s.verify, { verbose: true })} — run \`doctrina verify\`` : "not configured"}`);

  out.push("");
  if (s.openChanges.length === 0) {
    out.push("## Open work");
    out.push("");
    out.push("- none — the tree is at rest; start with `doctrina work \"<prompt>\"`");
  } else {
    for (const ch of s.openChanges) {
      out.push(`## Open change \`${ch.id}\`${ch.title ? ` — ${ch.title}` : ""}`);
      out.push("");
      out.push(`- proposal status: ${ch.status}`);
      if (ch.tasksTotal > 0) {
        out.push(`- tasks: ${ch.tasksDone}/${ch.tasksTotal} checked`);
        for (const t of ch.unchecked.slice(0, 8)) out.push(`  - [ ] ${t}`);
        if (ch.unchecked.length > 8) out.push(`  - … ${ch.unchecked.length - 8} more in tasks.md`);
      } else {
        out.push("- tasks: no tasks.md checklist found");
      }
      out.push(`- resume with: \`doctrina work --resume ${ch.id}\` · close with: \`doctrina close ${ch.id}\``);
      out.push("");
    }
  }

  out.push("## Next actions");
  out.push("");
  if (s.actions.length === 0) {
    out.push("1. nothing pending — `doctrina next` will confirm; pick up new work");
  } else {
    s.actions.forEach((a, i) => out.push(`${i + 1}. ${a.text}`));
  }

  out.push("");
  out.push("*Generated read-only from the tree — regenerate anytime with `doctrina handoff`.*");
  return out;
}

// ------------------------------------------------------------------- rules
//
// The project's standing rules, in full: the accepted ADRs and the product's
// declared non-goals. Assembled, never owned — to change a principle you
// supersede its ADR, to change a non-goal you edit product.md.
//
// One rendering, two callers (change 0049). `prime --rules` prints it, and
// `doctrina constitution` — deprecated, kept working — prints the same lines,
// so the merge is demonstrable rather than asserted. `prime` on its own still
// shows the ADR titles and a non-goal COUNT: the primer is a fixed-size read,
// and the full list is what `--rules` is for.
export function rules(s) {
  const out = [];
  out.push(c.bold("Standing rules") + c.gray(`  — ${s.project}  (accepted decisions + non-goals)`));
  out.push("");
  out.push(c.bold("  Principles") + c.gray("  (immutable — supersede an ADR to change one)"));
  if (s.adrs.length === 0) {
    out.push(`    ${c.gray("no accepted ADRs yet — record decisions with `doctrina decision new`")}`);
  } else {
    for (const a of s.adrs) out.push(`    ${c.cyan("ADR " + a.id)}  ${a.title}`);
  }
  out.push("");
  out.push(c.bold("  Non-goals") + c.gray("  (.doctrina/product.md)"));
  if (s.nonGoals.length === 0) {
    out.push(`    ${c.gray("none declared — add a `## Non-goals` section to product.md")}`);
  } else {
    for (const g of s.nonGoals) out.push(`    ${c.gray("•")} ${g}`);
  }
  out.push("");
  out.push(c.gray(`  ${s.adrs.length} accepted decision${s.adrs.length === 1 ? "" : "s"} · ` +
    `${s.nonGoals.length} non-goal${s.nonGoals.length === 1 ? "" : "s"} · read-only`));
  return out;
}

// ------------------------------------------------------------------ report

function asPct(x) {
  return typeof x === "number" ? `${(x * 100).toFixed(1)}%` : "—";
}

/**
 * @param {object} s the snapshot
 * @param {{ days?: number, cutoffIso?: string, git?: any, metrics?: any }} [options]
 */
export function report(s, { days = 7, cutoffIso = "", git = null, metrics = null } = {}) {
  const out = [];
  out.push(`# Doctrina report — ${s.project} (${cutoffIso} → ${today()})`);
  out.push("");

  out.push("## Gates");
  out.push("");
  out.push(`- index: ${s.indexState} · framework stamp: ${s.stamp ?? "—"} (CLI ${s.cli})`);
  out.push(`- coverage: ${coverageLabel(s.coverage)}` +
    (s.coverage.totalDangling ? ` — ${s.coverage.totalDangling} dangling` : "") +
    (s.coverage.totalConditional ? ` — ${s.coverage.totalConditional} conditional` : ""));
  out.push(`- trace: ${s.trace.anchors === 0 ? "no anchors declared" : `${s.trace.realized}/${s.trace.anchors} anchors realized`}`);
  out.push(`- verify: ${s.verify.configured ? `${s.verify.checks} checks declared${signoffNote(s.verify, { verbose: true })}` : "not configured"}`);

  out.push("");
  out.push("## Changes");
  out.push("");
  const archived = s.archive
    .filter((ch) => typeof ch.applied === "string" && ch.applied >= cutoffIso)
    .sort((a, b) => String(a.applied).localeCompare(String(b.applied)));
  if (archived.length === 0) {
    out.push(`- archived in period: none`);
  } else {
    out.push(`- archived in period: ${archived.length}`);
    for (const ch of archived) out.push(`  - ${ch.applied} — \`${ch.id}\` ${ch.title}`);
  }
  if (s.openChanges.length === 0) {
    out.push("- open now: none");
  } else {
    out.push(`- open now: ${s.openChanges.length}`);
    for (const ch of s.openChanges) {
      const tasks = ch.tasksTotal > 0 ? ` (tasks ${ch.tasksDone}/${ch.tasksTotal})` : "";
      out.push(`  - \`${ch.id}\`${ch.title ? ` ${ch.title}` : ""}${tasks}`);
    }
  }

  // What KIND of work the period held (change 0042). The classifier's verdict
  // used to be computed, printed and thrown away, so no report could answer
  // this — and the classifier had no set of right and wrong answers to be
  // calibrated against. A change with no recorded lane is counted as unknown,
  // never folded into a lane it might not belong to.
  const lanes = laneMix([...archived.map((ch) => ch.lane ?? null), ...s.openLanes]);
  if (lanes.total > 0) {
    out.push("");
    out.push("## Lanes");
    out.push("");
    for (const [lane, n] of lanes.rows) out.push(`- ${lane}: ${n}`);
    if (lanes.overridden > 0) {
      out.push(`- of which the operator opened a different lane than read: ${lanes.overridden}`);
    }
  }

  // WHERE the work landed, from the ledger rather than from git (change
  // 0046). git counts files; the ledger counts capabilities, which is the
  // unit the specs, the gates and this report are all written in. The number
  // is reported, never judged: a capability that moves often may be badly
  // drawn or may simply be where the work is, and nothing here can tell those
  // apart (ADR 0005).
  const churn = churnByCapability(s.ledger ?? [], { since: cutoffIso });
  if (churn.length > 0) {
    out.push("");
    out.push("## Capability churn (in period)");
    out.push("");
    for (const row of churn) {
      out.push(`- ${row.capability}: ${row.changes} change${row.changes === 1 ? "" : "s"} (last ${row.last})`);
    }
  }

  out.push("");
  out.push("## Artifacts");
  out.push("");
  out.push(`- specs: ${s.specs.total} · decisions: ${s.decisions.total}` +
    (s.decisions.proposed ? ` (${s.decisions.proposed} proposed)` : "") +
    ` · skills: ${s.skills}`);

  out.push("");
  out.push("## Git (local, last " + days + " days)");
  out.push("");
  if (!git) {
    out.push("- no git history available (not a repository, or git not installed)");
  } else {
    out.push(`- commits: ${git.commits} (${git.fixes} fix-shaped, ${git.commits ? Math.round((git.fixes / git.commits) * 100) : 0}%)`);
    if (git.churn.length > 0) {
      out.push(`- top-churn files:`);
      for (const [file, n] of git.churn) out.push(`  - ${file} (${n} touches)`);
    }
    // The rework proxies for the same window, from the same snapshot
    // `doctrina metrics` renders (change 0050) — reported, never judged:
    // both rates move with team size and release cadence, and iterative
    // work trips the re-edit proxy exactly like rework does.
    if (metrics) {
      out.push(`- reverts: ${metrics.reverts} (${asPct(metrics.revert_rate)} of commits)`);
      out.push(`- ${metrics.reedit_window_days}-day re-edit rate: ${asPct(metrics.reedit_rate)}` +
        " (touches a file edited in the prior window — a proxy for rework, not a verdict)");
    }
  }

  out.push("");
  out.push(`*Generated read-only by \`doctrina report --since ${days}\`; deeper numbers: \`doctrina metrics\`.*`);
  return out;
}

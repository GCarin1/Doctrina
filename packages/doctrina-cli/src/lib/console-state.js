// @ts-check
import path from "node:path";
import { isDir } from "./fs-ops.js";
import * as idx from "./index-json.js";
import { collectSnapshot } from "./snapshot.js";
import { invocation } from "./actions.js";
import { cliVersion } from "./version.js";
import { workspaceActions, workspaceRootAt, workspaceSnapshot } from "./workspace-view.js";

// WHAT THE CONSOLE'S PANEL SHOWS (change 0257).
//
// The console is a face for a human; the panel beside the conversation is
// the project's state — the gates, the open work, the next step — and it is
// read from the tree after every command, never kept by the console. It is
// the snapshot `prime`, `status` and `next` already render, reduced to what
// fits a side panel, so the panel cannot disagree with them.
//
// Nothing here prints and nothing here writes. `doctrina ui --state` emits
// it as JSON from a process of its own: the console is long-lived and the
// CLI's collectors were written for one run.

/** @typedef {"ok" | "warn" | "fail" | "off"} Light */
/** @typedef {{ id: string, state: Light, text: string }} Gate */
/** @typedef {{ id: string, title: string, status: string, done: number, total: number, stage: "plan" | "build" | "close", delivery: string | null }} OpenChange */
/** @typedef {{ kind: string, id: string, label: string, path: string }} Mention */
/**
 * @typedef {{
 *   kind: "project" | "workspace" | "none",
 *   project: string | null,
 *   cli: string,
 *   gates: Gate[],
 *   counts: { specs: number, decisions: number, skills: number, closed: number },
 *   open: OpenChange[],
 *   next: { text: string, command: string | null }[],
 *   recent: { id: string, date: string }[],
 *   projects: { name: string, mode: string, state: string, reason: string }[],
 *   mentions: Mention[],
 * }} ConsoleState
 */

const NEXT_SHOWN = 5;

/** A change's stage, from its tasks: written yet, ticked yet. */
function stageOf(ch) {
  const placeholders = ch.unchecked.filter((/** @type {string} */ t) => t.startsWith("(unwritten task")).length;
  if (ch.tasksTotal === 0 || placeholders > 0) return /** @type {const} */ ("plan");
  return ch.tasksDone >= ch.tasksTotal ? /** @type {const} */ ("close") : /** @type {const} */ ("build");
}

/** @returns {ConsoleState} */
function blank(kind) {
  return {
    kind, project: null, cli: cliVersion(), gates: [],
    counts: { specs: 0, decisions: 0, skills: 0, closed: 0 },
    open: [], next: [], recent: [], projects: [], mentions: [],
  };
}

/**
 * The panel's state for the directory the console runs in.
 * @param {string} cwd
 * @returns {ConsoleState}
 */
export function consoleState(cwd) {
  const wsRoot = workspaceRootAt(cwd);
  if (wsRoot) return workspaceState(wsRoot);
  if (!isDir(path.join(cwd, ".doctrina"))) {
    const out = blank("none");
    out.next = [
      { text: "this directory is not a Doctrina project yet", command: "doctrina init" },
      { text: "the whole cycle once, guided", command: "doctrina onboard" },
    ];
    return out;
  }
  const s = collectSnapshot(cwd);
  const out = blank("project");
  out.project = s.project;
  const cov = s.coverage;
  out.gates = [
    { id: "index", state: s.indexState === "in-sync" ? "ok" : "fail", text: s.indexState },
    cov.pct === null || cov.pct === undefined
      ? { id: "coverage", state: "off", text: "no criteria" }
      : { id: "coverage", state: cov.pct === 100 ? "ok" : "warn", text: `${cov.pct}% (${cov.totalCovered}/${cov.totalCriteria})` },
    s.trace.anchors === 0
      ? { id: "trace", state: "off", text: "no anchors" }
      : { id: "trace", state: s.trace.realized === s.trace.anchors ? "ok" : "warn", text: `${s.trace.realized}/${s.trace.anchors}` },
    !s.verify.configured
      ? { id: "verify", state: "off", text: "not set" }
      : (s.verify.invalid
        ? { id: "verify", state: "fail", text: "invalid" }
        : { id: "verify", state: "ok", text: `${s.verify.checks} check${s.verify.checks === 1 ? "" : "s"}` }),
  ];
  out.counts = { specs: s.specs.total, decisions: s.decisions.total, skills: s.skills, closed: s.archive.length };
  out.open = s.openChanges.map((ch) => ({
    id: ch.id, title: ch.title ?? "", status: ch.status, done: ch.tasksDone, total: ch.tasksTotal,
    stage: stageOf(ch), delivery: ch.delivery,
  }));
  out.next = s.actions.slice(0, NEXT_SHOWN).map((a) => ({ text: a.why, command: invocation(a) }));
  out.recent = s.recentlyClosed.map((r) => ({ id: r.id, date: r.date }));
  out.mentions = mentionsOf(cwd);
  return out;
}

/** What `@` completes to: the artifacts the index names. */
function mentionsOf(projectRoot) {
  /** @type {Mention[]} */
  const out = [];
  let index;
  try {
    index = idx.load(projectRoot);
  } catch {
    return out;
  }
  const a = index?.artifacts ?? {};
  for (const ch of a.changes ?? []) out.push({ kind: "change", id: ch.id, label: ch.title ?? "", path: `${ch.path}/proposal.md` });
  for (const s of a.specs ?? []) out.push({ kind: "spec", id: s.id, label: `v${s.version} · ${s.implementation ?? s.status ?? ""}`, path: s.path });
  for (const s of a.skills ?? []) out.push({ kind: "skill", id: s.id, label: s.description ?? "", path: s.path });
  for (const d of a.decisions ?? []) out.push({ kind: "adr", id: d.id, label: d.title ?? "", path: d.path });
  for (const ct of a.contracts ?? []) out.push({ kind: "contract", id: ct.id, label: "", path: ct.path });
  return out;
}

/** @returns {ConsoleState} */
function workspaceState(wsRoot) {
  const snap = workspaceSnapshot(wsRoot);
  const out = blank("workspace");
  out.project = snap.ws.name ?? path.basename(wsRoot);
  out.projects = snap.projects.map((p) => ({
    name: p.project.name, mode: p.project.mode ?? "", state: p.state, reason: p.reason ?? "",
  }));
  const ready = out.projects.filter((p) => p.state === "ready").length;
  out.gates = [
    { id: "projects", state: ready === out.projects.length ? "ok" : "warn", text: `${ready}/${out.projects.length} ready` },
    { id: "deliveries", state: snap.open.length === 0 ? "off" : "ok", text: `${snap.open.length} open` },
  ];
  out.counts.closed = snap.deliveries.length - snap.open.length;
  out.open = snap.open.map(({ delivery: d, rows }) => {
    const changes = rows.flatMap((r) => r.changes ?? []);
    const closed = changes.filter((/** @type {any} */ ch) => ch.archived || ch.status === "archived").length;
    return {
      id: d.id, title: d.title, status: d.status, done: closed, total: Math.max(d.projects.length, changes.length),
      stage: d.projects.length === 0 ? /** @type {const} */ ("plan") : /** @type {const} */ ("build"),
      delivery: null,
    };
  });
  out.next = workspaceActions(snap).slice(0, NEXT_SHOWN).map((a) => ({ text: a.text, command: a.command ?? null }));
  for (const p of out.projects) out.mentions.push({ kind: "project", id: p.name, label: `${p.mode} · ${p.state}`, path: p.name });
  for (const { delivery: d } of snap.open) out.mentions.push({ kind: "delivery", id: d.id, label: d.title, path: `deliveries/${d.id}/delivery.md` });
  return out;
}

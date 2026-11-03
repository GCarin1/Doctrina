// @ts-check
import { readdirSync } from "node:fs";
import path from "node:path";
import { isDir, isFile, read, write } from "./fs-ops.js";
import { listHeader } from "./scan.js";
import { checklistProgress, setHeader } from "./doc-model.js";
import { terms } from "./lexicon.js";
import { slugify, padNumber } from "./dates.js";
import { artifactRootOf } from "./workspace.js";

// A DELIVERY is one item of work that crosses repositories (ADR 0030): a
// story, a screen, a fix. It lives in the workspace's `deliveries/` and
// holds what no single repository owns — the story, the sources, the plan
// across projects, the release. Each project it touches gets ONE change,
// opened in that repository and carrying `- **Delivery:** <id>`, so the
// delivery's state is READ from the projects, never copied into it.

export const DELIVERY_FILE = "delivery.md";
export const DELIVERY_ID = /^\d{4}-[a-z0-9][a-z0-9-]*$/;

export function deliveriesDir(wsDir) {
  return path.join(wsDir, "deliveries");
}

/** Every delivery on disk, oldest first. */
export function listDeliveries(wsDir) {
  const dir = deliveriesDir(wsDir);
  if (!isDir(dir)) return [];
  return readdirSync(dir).filter((d) => DELIVERY_ID.test(d) && isFile(path.join(dir, d, DELIVERY_FILE))).sort()
    .map((id) => readDelivery(wsDir, id));
}

export function deliveryPath(wsDir, id) {
  return path.join(deliveriesDir(wsDir), id, DELIVERY_FILE);
}

/** A delivery by id — or by its number alone (`1`, `0001`). Null when absent. */
export function resolveDeliveryId(wsDir, ref) {
  if (!ref) return null;
  if (DELIVERY_ID.test(ref) && isFile(deliveryPath(wsDir, ref))) return ref;
  if (/^\d+$/.test(ref)) {
    const prefix = padNumber(Number(ref)) + "-";
    return listDeliveries(wsDir).find((d) => d.id.startsWith(prefix))?.id ?? null;
  }
  return null;
}

export function readDelivery(wsDir, id) {
  // CRLF on a Windows checkout: a `$` would leave the \r in the title.
  const text = read(deliveryPath(wsDir, id)).replace(/\r\n/g, "\n");
  const title = text.match(/^#\s+Delivery\s+\S+\s+[—-]\s+(.+)$/m)?.[1]?.trim() ?? id;
  const projects = (listHeader(text, "Projects") ?? "").split(",").map((s) => s.trim()).filter((s) => s && s !== "—");
  return {
    id, title, text,
    status: (listHeader(text, "Status") ?? "open").toLowerCase(),
    date: listHeader(text, "Date") ?? null,
    closed: listHeader(text, "Closed") ?? null,
    ref: listHeader(text, "Ref") ?? "—",
    projects,
  };
}

export function nextDeliveryId(wsDir, title) {
  const numbers = listDeliveries(wsDir).map((d) => Number(d.id.slice(0, 4)));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${padNumber(next)}-${slugify(title).slice(0, 40).replace(/-+$/, "") || "delivery"}`;
}

/** Rewrite one list header of a delivery (adding it when absent). */
export function setDeliveryHeader(wsDir, id, name, value) {
  const p = deliveryPath(wsDir, id);
  let text = read(p);
  const next = setHeader(text, name, value);
  if (next !== null) text = next;
  else text = text.replace(/^(- \*\*Projects:\*\*.*)$/m, `$1\n- **${name}:** ${value}`);
  write(p, text, { force: true });
}

/**
 * Projects ranked against a delivery's text — how many of its terms each
 * project's name, role, description and capability names share. A hint for
 * the orchestrator, never a decision (ADR 0005): `delivery route` is where
 * the projects are chosen.
 */
export function rankProjects(wsDir, ws, text) {
  const want = new Set(terms(text));
  const out = [];
  for (const p of ws.projects) {
    const caps = capabilityNames(wsDir, p);
    const words = new Set(terms([p.name, p.role, p.about, ...caps].join(" ")));
    const shared = [...want].filter((t) => words.has(t));
    out.push({ project: p, score: shared.length, shared, capabilities: caps });
  }
  return out.sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name));
}

function capabilityNames(wsDir, project) {
  const specs = path.join(artifactRootOf(wsDir, project), ".doctrina", "specs");
  if (!isDir(specs)) return [];
  return readdirSync(specs).filter((d) => isFile(path.join(specs, d, "spec.md")));
}

/** The projects in dependency order: a project after every project it depends on. */
export function dependencyOrder(ws, names) {
  const byName = new Map(ws.projects.map((p) => [p.name, p]));
  const out = [];
  const seen = new Set();
  const visit = (name, trail) => {
    if (seen.has(name) || trail.has(name)) return;
    trail.add(name);
    for (const dep of byName.get(name)?.dependsOn ?? []) if (names.includes(dep)) visit(dep, trail);
    seen.add(name);
    out.push(name);
  };
  for (const n of names) visit(n, new Set());
  return out;
}

/**
 * The changes each routed project carries for this delivery — open ones in
 * `changes/`, closed ones in `changes/archive/` — read from the projects.
 */
export function deliveryChanges(wsDir, ws, delivery) {
  const out = [];
  for (const name of delivery.projects) {
    const project = ws.projects.find((p) => p.name === name);
    if (!project) {
      out.push({ project: name, missing: "not registered in the workspace", changes: [] });
      continue;
    }
    const changesDir = path.join(artifactRootOf(wsDir, project), ".doctrina", "changes");
    const changes = [];
    for (const { dir, archived } of [{ dir: changesDir, archived: false }, { dir: path.join(changesDir, "archive"), archived: true }]) {
      if (!isDir(dir)) continue;
      for (const entry of readdirSync(dir).sort()) {
        const proposal = path.join(dir, entry, "proposal.md");
        if (entry === "archive" || !isFile(proposal)) continue;
        const text = read(proposal);
        if ((listHeader(text, "Delivery") ?? "").trim() !== delivery.id) continue;
        const tasks = path.join(dir, entry, "tasks.md");
        const progress = isFile(tasks) ? checklistProgress(read(tasks)) : { total: 0, done: 0 };
        changes.push({
          id: archived ? entry.replace(/^\d{4}-\d{2}-\d{2}-/, "") : entry,
          archived,
          status: archived ? "archived" : (listHeader(text, "Status") ?? "proposed").toLowerCase(),
          tasksDone: progress.done, tasksTotal: progress.total,
        });
      }
    }
    out.push({ project: name, path: project.path, changes });
  }
  return out;
}

/** A section's own text: comments and blank lines removed. Empty string when absent. */
export function sectionText(text, heading) {
  const lines = String(text).replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const at = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (at < 0) return "";
  const out = [];
  for (const l of lines.slice(at + 1)) {
    if (/^## /.test(l)) break;
    if (l.trim()) out.push(l.trim());
  }
  return out.join("\n");
}

/** Days between two YYYY-MM-DD dates, or null. */
export function daysBetween(from, to) {
  const a = Date.parse(String(from ?? "") + "T00:00:00Z");
  const b = Date.parse(String(to ?? "") + "T00:00:00Z");
  return Number.isNaN(a) || Number.isNaN(b) ? null : Math.round((b - a) / 86400000);
}

/**
 * The record a delivery keeps of its own work (change 0224): the story it
 * came from, every Release claim ticked, and at least one line of what was
 * watched after the release. The changes prove the code; these prove the
 * delivery reached its users and was looked at once it had.
 */
export function recordBlockers(delivery) {
  const out = [];
  if (sectionText(delivery.text, "Story") === "") out.push("## Story is empty — copy the tracker item's story and acceptance criteria, verbatim");
  const release = sectionText(delivery.text, "Release");
  const open = release.split("\n").filter((l) => /^[-*]\s*\[\s\]/.test(l));
  for (const box of open) out.push(`## Release: unticked — ${box.replace(/^[-*]\s*\[\s\]\s*/, "")}`);
  if (sectionText(delivery.text, "Observability") === "") out.push("## Observability is empty — record what was watched after the release (monitor, dashboard or query, the window, what it showed)");
  return out;
}

/**
 * Everything that keeps a delivery from closing. Each routed project must
 * carry at least one change for it, and every such change must be archived;
 * the delivery's own record must be written (recordBlockers).
 */
export function deliveryBlockers(wsDir, ws, delivery) {
  const blockers = [];
  if (delivery.projects.length === 0) blockers.push("no project routed — `doctrina delivery route <id> <a,b>`");
  for (const row of deliveryChanges(wsDir, ws, delivery)) {
    if (row.missing) blockers.push(`${row.project}: ${row.missing}`);
    else if (row.changes.length === 0) blockers.push(`${row.project}: no change carries this delivery — open one there with \`doctrina work "<title>" --delivery ${delivery.id}\``);
    else for (const ch of row.changes.filter((x) => !x.archived)) {
      blockers.push(`${row.project}: change ${ch.id} is ${ch.status} (${ch.tasksDone}/${ch.tasksTotal} tasks) — close it there with \`doctrina close ${ch.id}\``);
    }
  }
  blockers.push(...recordBlockers(delivery));
  return blockers;
}

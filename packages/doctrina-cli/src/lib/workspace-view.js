// @ts-check
import path from "node:path";
import { existsSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { listHeader } from "./scan.js";
import { absorbCommand, findWorkspace, projectAt, projectState, readWorkspace, linkPlan, shadowDirOf } from "./workspace.js";
import { deliveryBlockers, deliveryChanges, listDeliveries, rankProjects, readDelivery, releaseBoxes } from "./delivery.js";

// THE WORKSPACE ROOT IS WHERE THE PLANNER WORKS (change 0230).
//
// `prime` knew it: at a workspace root it printed the orchestrator's primer.
// Every other orientation command answered as if the directory were an empty
// project — `next` told the planner to run `doctrina init` there, which
// would have created a project inside the workspace, and `handoff`, `status`,
// `validate` and `context` refused with "not a Doctrina project". The planner
// lost exactly the commands AGENTS.md says to reach for before compaction and
// when unsure what comes next. This module decides what each of them says at
// the root; the commands render it (ADR 0025).

/**
 * The workspace this directory is the ROOT of — reached by the directory or
 * $DOCTRINA_WORKSPACE, with no `.doctrina/` of its own. A project inside a
 * workspace keeps its own answers; only the pointer route is never a root.
 * @returns {string | null}
 */
export function workspaceRootAt(cwd) {
  if (existsSync(path.join(cwd, ".doctrina"))) return null;
  const found = findWorkspace(cwd);
  return found && found.via !== "pointer" ? found.dir : null;
}

/**
 * Where the workspace stands: every project with its state, every open
 * delivery with its changes and what keeps it open.
 */
export function workspaceSnapshot(wsDir) {
  const ws = readWorkspace(wsDir);
  const projects = ws.projects.map((p) => ({ project: p, ...projectState(wsDir, p) }));
  const deliveries = listDeliveries(wsDir).map((d) => readDelivery(wsDir, d.id));
  const open = deliveries.filter((d) => d.status !== "closed").map((d) => ({
    delivery: d,
    rows: deliveryChanges(wsDir, ws, d),
    blockers: deliveryBlockers(wsDir, ws, d),
    release: releaseBoxes(d.text),
  }));
  return { ws, wsDir, projects, deliveries, open };
}

/**
 * The next actions at the workspace root, in the order they unblock work:
 * a missing repository first, then a project that cannot be routed to, then
 * each open delivery's next step, then — with nothing open — a new delivery.
 * @returns {Array<{ text: string, command: string }>}
 */
export function workspaceActions(snap) {
  const out = [];
  for (const p of snap.projects.filter((x) => x.state === "missing")) {
    out.push({ text: `${p.project.name}'s repository is not at its path — re-link it`, command: `doctrina workspace attach ${p.project.name} --path <dir>` });
  }
  for (const p of snap.projects.filter((x) => x.state === "pending")) {
    out.push(p.reason === "intake not converted"
      ? { text: `${p.project.name}'s absorb is under way (${p.reason}) — finish its playbook, then \`doctrina intake --converted\` there`, command: absorbCommand(p.project, p.reason) }
      : { text: `${p.project.name} has no specs yet (${p.reason}) — absorb it before routing work to it`, command: absorbCommand(p.project, p.reason) });
  }
  for (const { delivery: d, rows, blockers } of snap.open) {
    if (d.projects.length === 0) {
      out.push({ text: `delivery ${d.id} is routed nowhere yet`, command: `doctrina delivery route ${d.id} <a,b>` });
      continue;
    }
    let moved = false;
    for (const row of rows) {
      if (row.missing) continue;
      if (row.changes.length === 0) {
        out.push({ text: `${row.project} carries no change for ${d.id}`, command: `cd ${row.path} && doctrina work "${d.title}" --delivery ${d.id}` });
        moved = true;
        continue;
      }
      for (const ch of row.changes.filter((x) => !x.archived)) {
        out.push(ch.tasksDone < ch.tasksTotal
          ? { text: `${row.project}: ${ch.id} has ${ch.tasksTotal - ch.tasksDone} task${ch.tasksTotal - ch.tasksDone === 1 ? "" : "s"} left — hand the next card to an executor`, command: `cd ${row.path} && doctrina change card ${ch.id}` }
          : { text: `${row.project}: ${ch.id} has every task ticked — review and close it`, command: `cd ${row.path} && doctrina close ${ch.id}` });
        moved = true;
      }
    }
    if (moved) continue;
    out.push(blockers.length === 0
      ? { text: `delivery ${d.id} is ready to close`, command: `doctrina delivery close ${d.id}` }
      : recordAction(d, blockers[0]));
  }
  if (snap.open.length === 0 && snap.projects.length > 0 && out.length === 0) {
    out.push({ text: "no delivery is open — an item of work across repositories opens one", command: 'doctrina delivery new "<title>" --ref <id>' });
  }
  if (snap.projects.length === 0) {
    out.push({ text: "the workspace registers no repository yet", command: "doctrina workspace add <path> --role <r> --about \"<what it is>\"" });
  }
  return out;
}

/** The step that clears a delivery's first record gap — the command for it, not the check. */
function recordAction(d, blocker) {
  const file = `deliveries/${d.id}/delivery.md`;
  if (/^## Story/.test(blocker)) return { text: `delivery ${d.id}: copy the item's story and acceptance criteria, verbatim, under ## Story in ${file}`, command: `doctrina delivery check ${d.id}` };
  if (/^## Release/.test(blocker)) return { text: `delivery ${d.id}: record the release evidence under ## Release and tick each claim`, command: `doctrina delivery tick ${d.id}` };
  if (/^## Observability/.test(blocker)) return { text: `delivery ${d.id}: record what was watched after the release under ## Observability in ${file}`, command: `doctrina delivery check ${d.id}` };
  return { text: `delivery ${d.id}: ${blocker}`, command: `doctrina delivery check ${d.id}` };
}

/**
 * Structural findings about the workspace itself — the integrity
 * `doctrina validate` checks at its root. Errors break routing or a close;
 * warnings are worth knowing.
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function workspaceFindings(snap) {
  const errors = [];
  const warnings = [];
  const names = new Set(snap.ws.projects.map((p) => p.name));
  for (const p of snap.ws.projects) {
    for (const dep of p.dependsOn ?? []) if (!names.has(dep)) errors.push(`project ${p.name} depends on "${dep}", which the workspace does not register`);
  }
  for (const p of snap.projects) {
    if (p.state === "missing") errors.push(`project ${p.project.name}: ${p.reason} — \`doctrina workspace attach ${p.project.name} --path <dir>\``);
    if (p.project.mode !== "shadow" || p.state === "missing") continue;
    const shadow = shadowDirOf(snap.wsDir, p.project.name);
    if (!isDir(shadow)) {
      errors.push(`shadow ${p.project.name}: projects/${p.project.name}/ is gone`);
      continue;
    }
    const plan = linkPlan(shadow, p.project.path);
    const unlinked = plan.filter((l) => l.action === "link");
    const conflicts = plan.filter((l) => l.action === "conflict");
    if (unlinked.length > 0) errors.push(`shadow ${p.project.name}: ${unlinked.length} link${unlinked.length === 1 ? "" : "s"} missing from the repository — \`doctrina workspace attach ${p.project.name}\``);
    if (conflicts.length > 0) warnings.push(`shadow ${p.project.name}: the repository has its own ${conflicts.map((l) => l.rel).slice(0, 3).join(", ")} where a link would go`);
  }
  // A dependency the manifests declare and the registry does not (second
  // audit, change 0233): `delivery route` orders projects by --depends-on, so
  // a front end that imports the shared library's package but was registered
  // without the edge could be changed before the library it builds on.
  const pkgs = new Map(snap.ws.projects.map((p) => [p.name, packageFacts(p.path)]));
  for (const p of snap.ws.projects) {
    const mine = pkgs.get(p.name);
    if (!mine) continue;
    for (const other of snap.ws.projects) {
      const theirs = pkgs.get(other.name);
      if (other === p || !theirs?.name || !mine.deps.has(theirs.name) || (p.dependsOn ?? []).includes(other.name)) continue;
      warnings.push(`project ${p.name}'s package.json depends on ${theirs.name}, which is ${other.name} — declare it so routing orders them: \`doctrina workspace attach ${p.name} --depends-on ${[...(p.dependsOn ?? []), other.name].join(",")}\``);
    }
  }
  for (const d of snap.deliveries) {
    const status = (listHeader(d.text, "Status") ?? "").trim().toLowerCase();
    if (!["open", "closed"].includes(status)) errors.push(`delivery ${d.id}: Status must be open or closed (got "${status}")`);
    for (const name of d.projects) if (!names.has(name)) errors.push(`delivery ${d.id} routes "${name}", which the workspace does not register`);
    if (status === "closed" && !listHeader(d.text, "Closed")) warnings.push(`delivery ${d.id} is closed with no Closed date`);
  }
  if (!isFile(path.join(snap.wsDir, "AGENTS.md"))) warnings.push("the workspace has no AGENTS.md hub — any workspace write regenerates it");
  return { errors, warnings };
}

/** The resume note for the next planner session — `handoff` at the root. */
export function workspaceHandoff(snap, date) {
  const L = [`# Doctrina workspace handoff — ${snap.ws.name} (${date})`, ""];
  L.push("## Projects", "");
  for (const p of snap.projects) {
    const open = p.open.length ? ` · open: ${p.open.map((o) => o.id ?? o).join(", ")}` : "";
    L.push(`- **${p.project.name}** (${p.project.mode}, ${p.state}${p.project.role ? `, ${p.project.role}` : ""}) — ${p.reason}${open} · \`${p.project.path}\``);
  }
  if (snap.projects.length === 0) L.push("- none registered");
  L.push("", "## Open deliveries", "");
  for (const { delivery: d, rows, blockers, release } of snap.open) {
    L.push(`### ${d.id} — ${d.title}${d.ref && d.ref !== "—" ? ` (${d.ref})` : ""}`, "");
    for (const row of rows) {
      if (row.missing) { L.push(`- ${row.project}: ${row.missing}`); continue; }
      if (row.changes.length === 0) { L.push(`- ${row.project}: no change yet`); continue; }
      for (const ch of row.changes) L.push(`- ${row.project}: ${ch.id} — ${ch.status}, tasks ${ch.tasksDone}/${ch.tasksTotal}`);
    }
    if (release.length) L.push(`- Release: ${release.filter((b) => b.checked).length}/${release.length} claims ticked`);
    if (blockers.length) L.push(`- Before the close: ${blockers.length} — \`doctrina delivery check ${d.id}\``);
    L.push("");
  }
  if (snap.open.length === 0) L.push("- none", "");
  L.push("## Next actions", "");
  workspaceActions(snap).slice(0, 8).forEach((a, i) => L.push(`${i + 1}. ${a.text} — \`${a.command}\``));
  L.push("", "*Commit the workspace: it is the version history of every shadow's context. Regenerate with `doctrina handoff`.*");
  return L;
}

/**
 * The projects a task is most likely about — `context --for` at the root,
 * which cannot read one repository's specs for all of them.
 */
export function contextRouting(snap, task) {
  return rankProjects(snap.wsDir, snap.ws, task).map((r) => ({
    name: r.project.name, path: r.project.path, score: r.score, shared: r.shared,
    state: snap.projects.find((p) => p.project.name === r.project.name)?.state ?? "missing",
  }));
}

/** One-glance status at the root — `status`. */
export function workspaceStatus(snap) {
  const ready = snap.projects.filter((p) => p.state === "ready").length;
  const openChanges = snap.projects.reduce((n, p) => n + p.open.length, 0);
  return {
    name: snap.ws.name,
    projects: snap.projects.length, ready,
    pending: snap.projects.filter((p) => p.state === "pending").map((p) => p.project.name),
    missing: snap.projects.filter((p) => p.state === "missing").map((p) => p.project.name),
    openChanges,
    deliveries: { open: snap.open.length, closed: snap.deliveries.length - snap.open.length },
    tools: snap.ws.tools.length,
  };
}

/**
 * For `prime` inside a project of a workspace: the workspace it belongs to
 * and the open deliveries routed to it — an executor or a session opened in
 * the repository otherwise never learns a delivery is waiting on it.
 * @returns {{ name: string, dir: string, project: string, deliveries: Array<{ id: string, title: string, changes: string[], open: number }> } | null}
 */
export function projectWorkspaceLine(projectRoot) {
  const found = findWorkspace(projectRoot);
  if (!found) return null;
  let ws;
  try {
    ws = readWorkspace(found.dir);
  } catch {
    return null;
  }
  const project = projectAt(ws, projectRoot);
  if (!project) return null;
  const deliveries = [];
  for (const d of listDeliveries(found.dir)) {
    const full = readDelivery(found.dir, d.id);
    if (full.status === "closed" || !full.projects.includes(project.name)) continue;
    const row = deliveryChanges(found.dir, ws, full).find((r) => r.project === project.name);
    const changes = row?.changes ?? [];
    deliveries.push({ id: full.id, title: full.title, changes: changes.map((ch) => `${ch.id} ${ch.status}`), open: changes.filter((ch) => !ch.archived).length });
  }
  return { name: ws.name, dir: found.dir, project: project.name, deliveries };
}

/** The package name a repository publishes and the names it depends on — from its root package.json. */
function packageFacts(dir) {
  const file = path.join(dir, "package.json");
  if (!isFile(file)) return null;
  try {
    const pkg = JSON.parse(read(file));
    const deps = new Set(["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]
      .flatMap((k) => Object.keys(pkg?.[k] ?? {})));
    return { name: typeof pkg?.name === "string" ? pkg.name : null, deps };
  } catch {
    return null;
  }
}

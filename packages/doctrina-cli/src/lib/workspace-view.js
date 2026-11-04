// @ts-check
import path from "node:path";
import { existsSync, realpathSync } from "node:fs";
import { git, GIT_STATE } from "./git.js";
import { isDir, isFile, read } from "./fs-ops.js";
import { listHeader } from "./scan.js";
import { absorbCommand, findWorkspace, pointerPath, projectAt, projectState, readWorkspace, linkPlan, shadowDirOf } from "./workspace.js";
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
      if (row.missing || row.absent) continue;
      if (row.changes.length === 0 && row.abandoned?.length) {
        const a = row.abandoned[row.abandoned.length - 1];
        out.push({ text: `${row.project}'s change ${a.id} for ${d.id} was abandoned${a.reason ? ` (${a.reason})` : ""} — re-route the delivery without ${row.project}, or open a new change there`, command: `doctrina delivery route ${d.id} ${d.projects.filter((n) => n !== row.project).join(",") || "<a,b>"}` });
        moved = true;
        continue;
      }
      if (row.changes.length === 0) {
        out.push({ text: `${row.project} carries no change for ${d.id}`, command: `cd ${row.path} && doctrina work "${d.title}" --delivery ${d.id}` });
        moved = true;
        continue;
      }
      for (const ch of row.changes.filter((x) => !x.archived)) {
        if (ch.placeholders > 0) {
          out.push({ text: `${row.project}: ${ch.id} still holds the scaffold's placeholder tasks — write its delta and its tasks as cards before handing one out`, command: `cd ${row.path} && doctrina work --resume ${ch.id}` });
          moved = true;
          continue;
        }
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
  // An in-repo project owns its hook files, so the workspace does not write
  // them (third audit, change 0234): say when they leave the declared tools
  // unguarded for a session opened in that repository.
  if (snap.ws.tools.length > 0) {
    for (const p of snap.projects) {
      if (p.project.mode !== "in-repo" || p.state === "missing") continue;
      for (const [dir, file] of [[".cursor", "hooks.json"], [".claude", "settings.json"]]) {
        if (!isDir(path.join(p.project.path, dir))) continue;
        const f = path.join(p.project.path, dir, file);
        if (!isFile(f) || !read(f).includes("doctrina workspace guard")) {
          warnings.push(`project ${p.project.name} is in-repo and its ${dir}/${file} runs no \`doctrina workspace guard\` — the tools the workspace declares are unguarded in a session opened there; copy the guard entry from the workspace root's ${dir}/${file}`);
        }
      }
    }
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
    // A change that names this delivery from a project it does not route
    // (change 0234): no status, check or close of the delivery counts it.
    const outside = snap.ws.projects.map((p) => p.name).filter((n) => !d.projects.includes(n));
    for (const row of deliveryChanges(snap.wsDir, snap.ws, { ...d, projects: outside })) {
      for (const ch of row.changes.filter((x) => !x.archived)) {
        warnings.push(`${row.project}'s change ${ch.id} names delivery ${d.id}, which does not route ${row.project} — route it back (\`doctrina delivery route ${d.id} ${[...d.projects, row.project].join(",")}\`) or close the change outside it`);
      }
    }
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
      if (row.changes.length === 0 && row.abandoned?.length) { L.push(`- ${row.project}: ${row.abandoned.map((a) => `${a.id} abandoned${a.reason ? ` (${a.reason})` : ""}`).join(", ")} — no change left`); continue; }
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

/**
 * A clone of a SHADOWED repository at another path (third audit, change
 * 0234): it has no `.doctrina/` — the links live in the registered clone —
 * so every command answered "run `doctrina init`", which would plant a
 * `.doctrina/` in a repository that may not carry one. Matched by the git
 * remote: the clone's origin is the registered clone, or both share an origin.
 * @returns {{ wsDir: string, name: string, path: string } | null}
 */
export function shadowedCloneAt(cwd) {
  if (existsSync(path.join(cwd, ".doctrina"))) return null;
  // The pointer route finds a workspace only for a REGISTERED path; a clone
  // elsewhere is exactly what it cannot match, so the pointer is read here.
  const pointed = isFile(pointerPath()) ? read(pointerPath()).trim() : "";
  const found = findWorkspace(cwd) ?? (pointed && isFile(path.join(pointed, "workspace.json")) ? { dir: pointed } : null);
  if (!found) return null;
  const origin = (/** @type {string} */ dir) => {
    const r = git(dir, ["remote", "get-url", "origin"]);
    return r.state === GIT_STATE.OK ? r.stdout.trim().replace(/\.git$/, "").replace(/\/+$/, "") : null;
  };
  const real = (/** @type {string} */ p) => {
    try {
      return realpathSync(p);
    } catch {
      return path.resolve(p);
    }
  };
  const mine = origin(cwd);
  if (!mine) return null;
  let ws;
  try {
    ws = readWorkspace(found.dir);
  } catch {
    return null;
  }
  for (const p of ws.projects.filter((x) => x.mode === "shadow")) {
    if (real(p.path) === real(cwd)) continue;
    const theirs = isDir(p.path) ? origin(p.path) : null;
    const local = !/^[a-z][a-z0-9+.-]*:\/\/|^[^/\\]+@[^:]+:/i.test(mine) && isDir(path.resolve(cwd, mine)) && real(path.resolve(cwd, mine)) === real(p.path);
    if (local || (theirs && theirs === mine)) return { wsDir: found.dir, name: p.name, path: p.path };
  }
  return null;
}

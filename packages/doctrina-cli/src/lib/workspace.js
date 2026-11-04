// @ts-check
import {
  existsSync, lstatSync, linkSync, mkdirSync, readFileSync, readdirSync,
  realpathSync, rmdirSync, statSync, symlinkSync, unlinkSync, copyFileSync,
} from "node:fs";
import path from "node:path";
import os from "node:os";
import { isDir, isFile, read, toPosix, write } from "./fs-ops.js";
import { listHeader } from "./scan.js";
import { openChanges } from "./snapshot.js";
import { git as runGit, GIT_STATE } from "./git.js";
import { cdThen } from "./shell.js";

// A WORKSPACE holds the context of several repositories in one place (ADR
// 0029): which projects exist, what each one is, how they depend on each
// other, and — for a repository that cannot carry `.doctrina/` — the
// artifacts themselves. It is a plain directory the human keeps as a private
// git repository, so the context of a repository nobody may commit to is
// still versioned, by its owner, somewhere.
//
// The CLI never moves the code. A SHADOW project's artifacts live under
// `<workspace>/projects/<name>/` and are LINKED into the repository, then
// hidden from that repository's git through `.git/info/exclude` — a file git
// reads and never commits. Every existing command keeps working unchanged in
// the repository, because from its working directory `.doctrina/` is simply
// there.

export const WORKSPACE_FILE = "workspace.json";
export const WORKSPACE_SCHEMA = 1;
export const PROJECT_MODES = ["in-repo", "shadow"];
export const PROJECT_NAME = /^[a-z0-9][a-z0-9._-]*$/;
export const EXCLUDE_BEGIN = "# doctrina:workspace:begin — managed by `doctrina workspace attach`; edits inside are overwritten";
export const EXCLUDE_END = "# doctrina:workspace:end";

/** A fresh workspace document. */
export function blankWorkspace(name) {
  return {
    doctrina_workspace: WORKSPACE_SCHEMA,
    name,
    projects: [],
    tools: [],
    agents: { planner: { model: "inherit" }, executor: { model: "inherit" } },
  };
}

export function isWorkspaceDir(dir) {
  const p = path.join(dir, WORKSPACE_FILE);
  if (!isFile(p)) return false;
  try {
    return JSON.parse(read(p)).doctrina_workspace !== undefined;
  } catch {
    return false;
  }
}

/** The workspace document, with every optional list present. */
export function readWorkspace(dir) {
  const ws = JSON.parse(read(path.join(dir, WORKSPACE_FILE)));
  ws.projects = Array.isArray(ws.projects) ? ws.projects : [];
  ws.tools = Array.isArray(ws.tools) ? ws.tools : [];
  ws.agents = ws.agents && typeof ws.agents === "object" ? ws.agents : {};
  return ws;
}

export function writeWorkspace(dir, ws) {
  write(path.join(dir, WORKSPACE_FILE), JSON.stringify(ws, null, 2) + "\n", { force: true });
}

/** Where the CLI keeps its per-user state: `$DOCTRINA_HOME`, else `~/.doctrina`. */
export function doctrinaHome(env = process.env) {
  return env.DOCTRINA_HOME && env.DOCTRINA_HOME.trim() !== ""
    ? path.resolve(env.DOCTRINA_HOME)
    : path.join(os.homedir(), ".doctrina");
}

/** The pointer `workspace init` leaves, so an in-repo project can find its workspace. */
export function pointerPath(env = process.env) {
  return path.join(doctrinaHome(env), "workspace");
}

export function writePointer(dir, env = process.env) {
  write(pointerPath(env), path.resolve(dir) + "\n", { force: true });
}

function ancestors(start) {
  const out = [];
  let cur = path.resolve(start);
  for (;;) {
    out.push(cur);
    const up = path.dirname(cur);
    if (up === cur) return out;
    cur = up;
  }
}

/**
 * The workspace this directory belongs to, or null. In order:
 *   1. `$DOCTRINA_WORKSPACE`;
 *   2. the directory or an ancestor holding `workspace.json` (the orchestrator
 *      runs at the workspace root);
 *   3. the real path of `./.doctrina` — a shadow project's link points into
 *      its workspace;
 *   4. the pointer `workspace init` wrote, when the workspace lists this
 *      directory as a project.
 * @returns {{ dir: string, via: string } | null}
 */
export function findWorkspace(cwd, env = process.env) {
  if (env.DOCTRINA_WORKSPACE && env.DOCTRINA_WORKSPACE.trim() !== "") {
    const dir = path.resolve(env.DOCTRINA_WORKSPACE);
    return isWorkspaceDir(dir) ? { dir, via: "DOCTRINA_WORKSPACE" } : null;
  }
  for (const dir of ancestors(cwd)) {
    if (isWorkspaceDir(dir)) return { dir, via: "directory" };
  }
  const local = path.join(cwd, ".doctrina");
  if (existsSync(local)) {
    try {
      const real = realpathSync(local);
      if (real !== path.resolve(local)) {
        for (const dir of ancestors(path.dirname(real))) {
          if (isWorkspaceDir(dir)) return { dir, via: "shadow link" };
        }
      }
    } catch { /* an unreadable link is no workspace */ }
  }
  const pointer = pointerPath(env);
  if (isFile(pointer)) {
    const dir = read(pointer).trim();
    if (dir && isWorkspaceDir(dir) && projectAt(readWorkspace(dir), cwd)) return { dir, via: "pointer" };
  }
  return null;
}

/** The registered project whose path is `dir`, or null. */
export function projectAt(ws, dir) {
  const want = safeReal(dir);
  return ws.projects.find((p) => safeReal(p.path) === want) ?? null;
}

function safeReal(p) {
  try {
    return realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

export function shadowDirOf(wsDir, name) {
  return path.join(wsDir, "projects", name);
}

/** The directory whose `.doctrina/` holds this project's artifacts. */
export function artifactRootOf(wsDir, project) {
  return project.mode === "shadow" ? shadowDirOf(wsDir, project.name) : project.path;
}

/**
 * Where a project stands. `missing` when its repository path is gone;
 * `pending` while it has no spec or its intake is unconverted — the
 * project still has to be absorbed; `ready` otherwise.
 */
const INTAKE_PENDING = "intake not converted";
// A shadow's folder in the workspace is gone (change 0235): `attach` restores it.
const SHADOW_GONE = "its shadow folder in the workspace is gone";

/**
 * The command that moves a pending project on (second audit, change 0233).
 * `--from-code` starts an absorb and refuses once the inventory is stored —
 * every surface still named it for a project whose absorb was under way. A
 * stored, pending intake reprints its playbook with a bare `doctrina intake`.
 * @param {{ path: string, name?: string }} project
 * @param {string} reason  projectState's reason
 */
export function absorbCommand(project, reason) {
  if (reason === SHADOW_GONE) return `doctrina workspace attach ${project.name ?? "<name>"}`;
  return reason === INTAKE_PENDING
    ? cdThen(project.path, "doctrina intake")
    : cdThen(project.path, "doctrina intake --from-code");
}

export function projectState(wsDir, project) {
  if (!isDir(project.path)) return { state: "missing", reason: `path not found: ${project.path}`, open: [] };
  const root = artifactRootOf(wsDir, project);
  const doctrina = path.join(root, ".doctrina");
  if (project.mode === "shadow" && !isDir(doctrina)) return { state: "pending", reason: SHADOW_GONE, open: [] };
  if (!isDir(doctrina)) return { state: "pending", reason: "no .doctrina/ yet", open: [] };
  const intake = path.join(doctrina, "intake.md");
  if (isFile(intake) && /pending/i.test(listHeader(read(intake), "Status") ?? "")) {
    return { state: "pending", reason: INTAKE_PENDING, open: openChanges(root) };
  }
  const specs = path.join(doctrina, "specs");
  const count = isDir(specs) ? readdirSync(specs).filter((d) => isFile(path.join(specs, d, "spec.md"))).length : 0;
  if (count === 0) return { state: "pending", reason: "no capability spec yet", open: openChanges(root) };
  return { state: "ready", reason: `${count} spec${count === 1 ? "" : "s"}`, open: openChanges(root) };
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

function shadowFiles(shadowDir) {
  const out = [];
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    for (const entry of readdirSync(path.join(shadowDir, rel))) {
      const r = rel ? path.join(rel, entry) : entry;
      if (r === ".git" || r === ".doctrina") continue;
      if (isDir(path.join(shadowDir, r))) stack.push(r);
      else out.push(r);
    }
  }
  return out.sort();
}

/** True when `at` already resolves to `target` (a symlink, a junction, or a hard link). */
export function linksTo(at, target) {
  let st;
  try {
    st = lstatSync(at);
  } catch {
    return false;
  }
  if (st.isSymbolicLink()) return safeReal(at) === safeReal(target);
  try {
    const t = statSync(target);
    return !st.isDirectory() && st.ino === t.ino && st.dev === t.dev && st.ino !== 0;
  } catch {
    return false;
  }
}

/**
 * What attaching a shadow project would do, entry by entry. `.doctrina/` is
 * linked as one directory — every command creates files inside it. Every
 * other file the shadow holds (AGENTS.md, the agent's rule and hooks) is
 * linked one by one, so a repository that already has a `.cursor/` keeps it.
 * A path the repository already owns is a conflict, left untouched.
 * @returns {{ rel: string, kind: "dir"|"file", action: "link"|"ok"|"conflict" }[]}
 */
export function linkPlan(shadowDir, repoDir) {
  const entries = [{ rel: ".doctrina", kind: /** @type {const} */ ("dir") },
    ...shadowFiles(shadowDir).map((rel) => ({ rel, kind: /** @type {const} */ ("file") }))];
  return entries.map(({ rel, kind }) => {
    const at = path.join(repoDir, rel);
    const target = path.join(shadowDir, rel);
    let action = /** @type {"link"|"ok"|"conflict"} */ ("link");
    if (linksTo(at, target)) action = "ok";
    else if (existsOrLink(at)) action = "conflict";
    return { rel: toPosix(rel), kind, action };
  });
}

function existsOrLink(p) {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create the links a plan calls for. A directory becomes a symlink (a
 * junction on Windows, which needs no privilege); a file becomes a symlink,
 * else a hard link, else — last resort — a copy, which `attach` reports
 * because a copy does not follow the shadow.
 * @returns {{ rel: string, how: string }[]}
 */
export function applyLinks(plan, shadowDir, repoDir) {
  const done = [];
  for (const entry of plan) {
    if (entry.action !== "link") continue;
    const at = path.join(repoDir, entry.rel);
    const target = path.join(shadowDir, entry.rel);
    mkdirSync(path.dirname(at), { recursive: true });
    if (entry.kind === "dir") {
      symlinkSync(target, at, "junction");
      done.push({ rel: entry.rel, how: "linked" });
      continue;
    }
    try {
      symlinkSync(target, at, "file");
      done.push({ rel: entry.rel, how: "linked" });
    } catch {
      try {
        linkSync(target, at);
        done.push({ rel: entry.rel, how: "hard-linked" });
      } catch {
        copyFileSync(target, at);
        done.push({ rel: entry.rel, how: "copied" });
      }
    }
  }
  return done;
}

/**
 * Remove every link the shadow put in the repository — the link, never what
 * it points at: `fs-ops.remove` follows a directory link and would empty
 * the shadow, which is why this module does its own unlinking.
 * @returns {string[]} the paths removed
 */
export function removeLinks(shadowDir, repoDir) {
  const removed = [];
  for (const entry of linkPlan(shadowDir, repoDir)) {
    if (entry.action !== "ok") continue;
    const at = path.join(repoDir, entry.rel);
    try {
      unlinkSync(at);
    } catch {
      rmdirSync(at);
    }
    removed.push(entry.rel);
    pruneEmpty(path.dirname(at), repoDir);
  }
  return removed;
}

function pruneEmpty(dir, stopAt) {
  let cur = dir;
  while (cur.startsWith(stopAt + path.sep)) {
    try {
      if (readdirSync(cur).length > 0) return;
      rmdirSync(cur);
    } catch {
      return;
    }
    cur = path.dirname(cur);
  }
}

// ---------------------------------------------------------------------------
// The repository's local exclude file
// ---------------------------------------------------------------------------

function git(repoDir, args) {
  const r = runGit(repoDir, args);
  return r.state === GIT_STATE.OK ? r.stdout : null;
}

/** `git init` a new workspace. True when it worked. */
export function gitInit(dir) {
  return runGit(dir, ["init", "-q"]).state === GIT_STATE.OK;
}

/** `.git/info/exclude` for this repository (worktrees included), or null outside git. */
export function excludePathOf(repoDir) {
  const out = git(repoDir, ["rev-parse", "--git-path", "info/exclude"]);
  if (out === null) return null;
  return path.resolve(repoDir, out.trim());
}

/** True when the repository tracks anything under `rel`. */
export function tracksAnything(repoDir, rel) {
  const out = git(repoDir, ["ls-files", "--", rel]);
  return out !== null && out.trim() !== "";
}

/** The patterns that keep a shadow invisible to the repository's git. */
export function excludeEntries(plan, repoDir) {
  // No trailing slash on a linked directory: git sees a symlink as a file,
  // and `/.doctrina/` would match only a real directory.
  const out = plan.filter((e) => e.action !== "conflict").map((e) => "/" + e.rel);
  // `index rebuild` exports skills into the repository's own folders; they
  // belong to the shadow too, unless the repository already keeps skills.
  for (const dir of [".agents/skills", ".claude/skills"]) {
    if (!tracksAnything(repoDir, dir)) out.push(`/${dir}/`);
  }
  return [...new Set(out)];
}

/** Replace the managed block of an exclude file's text. */
export function withExcludeBlock(text, entries) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const b = lines.indexOf(EXCLUDE_BEGIN);
  const e = lines.indexOf(EXCLUDE_END);
  const kept = b >= 0 && e > b ? [...lines.slice(0, b), ...lines.slice(e + 1)] : lines;
  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();
  if (entries.length === 0) return kept.length ? kept.join("\n") + "\n" : "";
  return [...kept, ...(kept.length ? [""] : []), EXCLUDE_BEGIN, ...entries, EXCLUDE_END, ""].join("\n");
}

/** Write (or with no entries, clear) the managed block. Returns the file, or null outside git. */
export function writeExclude(repoDir, entries) {
  const p = excludePathOf(repoDir);
  if (!p) return null;
  const before = existsSync(p) ? readFileSync(p, "utf8") : "";
  mkdirSync(path.dirname(p), { recursive: true });
  write(p, withExcludeBlock(before, entries), { force: true });
  return p;
}

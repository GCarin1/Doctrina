// @ts-check
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { isFile, read, write } from "./fs-ops.js";

// WHERE A WORKSPACE IS, and nothing else (fifth audit, change 0236). The
// guard runs on every MCP call an agent makes, and it needs only this: find
// the workspace, read its registry. It used to load lib/workspace.js, which
// pulls the project snapshot and git in with it — ~90 ms a call. Everything
// here is re-exported by lib/workspace.js, so callers keep one door.

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

export function safeReal(p) {
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

// @ts-check
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { exists, isDir, mkdirp, relPath, write } from "../lib/fs-ops.js";
import { flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { EXIT, PreconditionError } from "../lib/exit-codes.js";
import {
  PROJECT_MODES, PROJECT_NAME, WORKSPACE_FILE, applyLinks, blankWorkspace, excludeEntries,
  findWorkspace, isWorkspaceDir, linkPlan, projectAt, projectState, readWorkspace, removeLinks,
  shadowDirOf, writeExclude, writePointer, writeWorkspace, gitInit,
} from "../lib/workspace.js";
import { TOOL_PRESETS, toolEntry } from "../lib/workspace-tools.js";
import { workspaceGuard } from "../lib/workspace-guard.js";
import { writeOrchestratorFiles } from "../lib/workspace-agents.js";
import { cdThen } from "../lib/shell.js";
import { mcpServerNames } from "../lib/workspace-view.js";

// `doctrina workspace` — the context of several repositories in one place
// (ADR 0029). The decisions live in lib/workspace.js; this module renders
// them and runs the one child process it needs (`init` inside a shadow).

const SUBCOMMANDS = ["init", "add", "attach", "detach", "list", "tool", "guard"];
const CLI_ENTRY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "index.js");

export const flags = {
  boolean: ["json", "no-git", "remove"],
  string: ["name", "mode", "role", "about", "depends-on", "agent", "path", "server", "access", "for", "purpose", "only", "hook"],
};

export async function run(positional, flags) {
  const sub = positional[0];
  if (!SUBCOMMANDS.includes(sub)) {
    console.error(c.red("error:") + ` unknown workspace subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess ? `did you mean \`doctrina workspace ${guess}\`?` : `available: ${SUBCOMMANDS.join(", ")}`));
    return EXIT.USAGE;
  }
  if (sub === "init") return workspaceInit(positional[1], flags);
  const found = findWorkspace(process.cwd());
  // The guard answers an agent's pre-call hook, so it never fails the call
  // for want of a workspace: no workspace, no opinion.
  if (sub === "guard") return workspaceGuard(found?.dir ?? null, flagString(flags, "hook"));
  if (!found) {
    throw new PreconditionError(
      "no workspace here (no workspace.json in this directory or above, and $DOCTRINA_WORKSPACE is unset)",
      "doctrina workspace init <dir>",
    );
  }
  let code;
  if (sub === "add") code = workspaceAdd(found.dir, positional[1], flags);
  else if (sub === "attach") code = workspaceAttach(found.dir, positional[1], flags);
  else if (sub === "detach") code = workspaceDetach(found.dir, positional[1]);
  else if (sub === "tool") code = workspaceTool(found.dir, positional[1], flags);
  else return workspaceList(found.dir);
  if (code === EXIT.OK) regenerate(found.dir);
  return code;
}

function workspaceInit(dirArg, flags) {
  const dir = path.resolve(process.cwd(), dirArg ?? ".");
  if (isWorkspaceDir(dir)) {
    console.error(c.red("error:") + ` ${dir} is already a workspace`);
    console.error(c.gray("hint: ") + "add a project to it: `doctrina workspace add <path>`");
    return EXIT.PRECONDITION;
  }
  const name = flagString(flags, "name") ?? path.basename(dir);
  mkdirp(path.join(dir, "projects"));
  mkdirp(path.join(dir, "deliveries"));
  writeWorkspace(dir, blankWorkspace(name));
  if (!exists(path.join(dir, ".gitignore"))) {
    write(path.join(dir, ".gitignore"), "node_modules/\n.env\n.env.*\n*.log\n");
  }
  for (const keep of ["projects", "deliveries"]) {
    if (!exists(path.join(dir, keep, ".gitkeep"))) write(path.join(dir, keep, ".gitkeep"), "");
  }
  console.log(c.green("created") + ` workspace "${name}" at ${dir}`);
  if (!flags.get("no-git") && !exists(path.join(dir, ".git"))) {
    console.log(gitInit(dir)
      ? c.green("created") + " a git repository for it — keep it private: it versions the context of repositories that cannot carry their own"
      : c.yellow("warn:") + " git is not available; the workspace is not versioned yet (`git init` it yourself)");
  }
  writePointer(dir);
  regenerate(dir);
  console.log("");
  console.log("Next: register each repository the work touches —");
  console.log("  " + c.cyan("doctrina workspace add <path> --role front|back|app|qa --about \"<what it is>\""));
  console.log(c.gray("  A repository with its own .doctrina/ is registered in-repo; one without is shadowed: its"));
  console.log(c.gray("  artifacts live here and are linked into it, invisible to its git."));
  return EXIT.OK;
}

function workspaceAdd(wsDir, pathArg, flags) {
  if (!pathArg) {
    console.error(c.red("error:") + " workspace add needs the repository's path");
    console.error(c.gray("hint: ") + "doctrina workspace add ../front-core --role front --about \"design system and shell\"");
    return EXIT.USAGE;
  }
  const repo = path.resolve(process.cwd(), pathArg);
  if (!isDir(repo)) {
    console.error(c.red("error:") + ` not a directory: ${pathArg}`);
    return EXIT.PRECONDITION;
  }
  const ws = readWorkspace(wsDir);
  const name = flagString(flags, "name") ?? path.basename(repo).toLowerCase();
  if (!PROJECT_NAME.test(name)) {
    console.error(c.red("error:") + ` project name "${name}" must match ${PROJECT_NAME} — pass --name`);
    return EXIT.USAGE;
  }
  if (ws.projects.some((p) => p.name === name)) {
    console.error(c.red("error:") + ` a project named "${name}" is already registered`);
    console.error(c.gray("hint: ") + `relink it with \`doctrina workspace attach ${name}\`, or pass another --name`);
    return EXIT.PRECONDITION;
  }
  const already = projectAt(ws, repo);
  if (already) {
    console.error(c.red("error:") + ` ${repo} is already registered as "${already.name}"`);
    return EXIT.PRECONDITION;
  }
  const hasOwn = isDir(path.join(repo, ".doctrina"));
  const mode = flagString(flags, "mode") ?? (hasOwn ? "in-repo" : "shadow");
  if (!PROJECT_MODES.includes(mode)) {
    console.error(c.red("error:") + ` --mode must be one of ${PROJECT_MODES.join(", ")} (got "${mode}")`);
    return EXIT.USAGE;
  }
  if (mode === "shadow" && hasOwn) {
    console.error(c.red("error:") + " this repository already carries its own .doctrina/ — register it in-repo");
    return EXIT.PRECONDITION;
  }
  const dependsOn = (flagString(flags, "depends-on") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = dependsOn.filter((d) => !ws.projects.some((p) => p.name === d));
  if (unknown.length > 0) {
    console.error(c.red("error:") + ` --depends-on names no registered project: ${unknown.join(", ")}`);
    return EXIT.USAGE;
  }
  const project = {
    name, path: repo, mode,
    role: flagString(flags, "role") ?? "",
    about: flagString(flags, "about") ?? "",
    dependsOn,
  };
  if (mode === "shadow" && !scaffoldShadow(wsDir, project, flagString(flags, "agent") ?? "cursor")) return EXIT.GATE;
  ws.projects.push(project);
  writeWorkspace(wsDir, ws);
  console.log(c.green("registered") + ` ${name} (${mode}) → ${repo}`);
  if (mode === "shadow") attachShadow(wsDir, project);
  printProjectNext(wsDir, project);
  return EXIT.OK;
}

function attachShadow(wsDir, project) {
  const shadow = shadowDirOf(wsDir, project.name);
  const plan = linkPlan(shadow, project.path);
  const done = applyLinks(plan, shadow, project.path);
  for (const d of done) {
    console.log(c.green(d.how.padEnd(11)) + ` ${d.rel}` + (d.how === "copied" ? c.yellow("  (a copy: rerun attach after the shadow changes)") : ""));
  }
  for (const e of plan.filter((p) => p.action === "conflict")) {
    console.log(c.yellow("kept       ") + ` ${e.rel} — the repository already has its own; the shadow's copy is not linked`);
  }
  const excludeFile = writeExclude(project.path, excludeEntries(plan, project.path));
  console.log(excludeFile
    ? c.gray(`hidden from the repository's git by ${relPath(project.path, excludeFile)} (never committed)`)
    : c.yellow("warn:") + " not a git repository — nothing hides the links from version control");
}

function printProjectNext(wsDir, project) {
  const st = projectState(wsDir, project);
  if (st.state === "pending") {
    console.log("");
    console.log(`Next: ${project.name} has no specs yet (${st.reason}) — absorb it from its code:`);
    console.log("  " + c.cyan(cdThen(project.path, "doctrina intake --from-code")));
  }
}

function findProject(ws, name) {
  const project = ws.projects.find((p) => p.name === name);
  if (project) return project;
  const guess = suggest(name ?? "", ws.projects.map((p) => p.name));
  throw Object.assign(new Error(`no project named "${name ?? ""}" in this workspace` + (guess ? ` — did you mean "${guess}"?` : "")), { exitCode: EXIT.USAGE });
}

/** Scaffold a shadow's AGENTS.md, .doctrina/ and adapter when they are not there. */
function scaffoldShadow(wsDir, project, agent) {
  const shadow = shadowDirOf(wsDir, project.name);
  if (isDir(path.join(shadow, ".doctrina"))) return true;
  mkdirp(shadow);
  const r = spawnSync(process.execPath, [CLI_ENTRY, "init", "--non-interactive",
    "--project-name", project.name, "--project-description", project.about || `${project.name} (absorbed into a workspace)`,
    "--agent", agent], { cwd: shadow, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  if (r.status !== 0) {
    console.error(c.red("error:") + ` could not scaffold the shadow at ${shadow}`);
    console.error(r.stderr.trim());
    return false;
  }
  console.log(c.green("created") + ` shadow ${relPath(wsDir, shadow)}/ (AGENTS.md, .doctrina/, ${agent} adapter)`);
  return true;
}

function workspaceAttach(wsDir, name, flags) {
  const ws = readWorkspace(wsDir);
  const project = findProject(ws, name);
  const newPath = flagString(flags, "path");
  if (newPath) {
    const repo = path.resolve(process.cwd(), newPath);
    if (!isDir(repo)) {
      console.error(c.red("error:") + ` not a directory: ${newPath}`);
      return EXIT.PRECONDITION;
    }
    project.path = repo;
    writeWorkspace(wsDir, ws);
    console.log(c.green("moved") + ` ${project.name} → ${repo}`);
  }
  // --depends-on on a registered project (second audit, change 0233): the
  // edge `delivery route` orders by could only be given at `add`, before the
  // project it names was always registered.
  if (flags.has("depends-on")) {
    const dependsOn = (flagString(flags, "depends-on") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = dependsOn.filter((d) => d === project.name || !ws.projects.some((p) => p.name === d));
    if (unknown.length > 0) {
      console.error(c.red("error:") + ` --depends-on names no other registered project: ${unknown.join(", ")}`);
      return EXIT.USAGE;
    }
    project.dependsOn = dependsOn;
    writeWorkspace(wsDir, ws);
    console.log(c.green("depends on") + ` ${project.name} → ${dependsOn.join(", ") || "nothing"}`);
  }
  if (project.mode !== "shadow") {
    console.log(c.gray(`${project.name} is in-repo — its .doctrina/ is its own; nothing to link`));
    return EXIT.OK;
  }
  if (!isDir(project.path)) {
    console.error(c.red("error:") + ` ${project.name}'s repository is not at ${project.path}`);
    console.error(c.gray("hint: ") + `point it at the clone: \`doctrina workspace attach ${project.name} --path <dir>\``);
    return EXIT.PRECONDITION;
  }
  // A shadow whose folder is gone (fourth audit, change 0235): attach
  // crashed on ENOENT. A fresh, empty shadow is scaffolded and linked — the
  // project is pending again, and says so; its history is the workspace's
  // git, where a lost folder is restored from.
  if (!isDir(path.join(shadowDirOf(wsDir, project.name), ".doctrina"))) {
    console.log(c.yellow("warn") + ` ${project.name}'s shadow projects/${project.name}/ is gone — if the workspace's git has it, restore it (\`git checkout -- projects/${project.name}\`) before this; scaffolding an empty one`);
    if (!scaffoldShadow(wsDir, project, flagString(flags, "agent") ?? "cursor")) return EXIT.GATE;
  }
  attachShadow(wsDir, project);
  return EXIT.OK;
}

function workspaceDetach(wsDir, name) {
  const ws = readWorkspace(wsDir);
  const project = findProject(ws, name);
  if (project.mode !== "shadow") {
    console.log(c.gray(`${project.name} is in-repo — nothing was linked`));
    return EXIT.OK;
  }
  const removed = isDir(project.path) ? removeLinks(shadowDirOf(wsDir, project.name), project.path) : [];
  for (const r of removed) console.log(c.green("unlinked") + ` ${r}`);
  if (isDir(project.path)) writeExclude(project.path, []);
  console.log(c.gray(`the shadow stays in ${relPath(wsDir, shadowDirOf(wsDir, project.name))}/ — \`doctrina workspace attach ${project.name}\` links it again`));
  return EXIT.OK;
}

// The orchestrator's files follow the registry on every write (change 0223).
function regenerate(wsDir) {
  const ws = readWorkspace(wsDir);
  const states = new Map(ws.projects.map((p) => [p.name, projectState(wsDir, p).state]));
  const written = writeOrchestratorFiles(ws, wsDir, states);
  if (written.length > 0) console.log(c.gray(`orchestrator files: ${written.join(", ")}`));
}

function workspaceTool(wsDir, name, flags) {
  if (!name) {
    console.error(c.red("error:") + " workspace tool needs the tool's name");
    console.error(c.gray("hint: ") + `presets: ${Object.keys(TOOL_PRESETS).join(", ")} — or --server <name in your agent's MCP config>`);
    return EXIT.USAGE;
  }
  const ws = readWorkspace(wsDir);
  const at = ws.tools.findIndex((t) => t.name === name);
  if (flags.get("remove")) {
    if (at < 0) {
      console.error(c.red("error:") + ` no tool named "${name}"`);
      return EXIT.USAGE;
    }
    ws.tools.splice(at, 1);
    writeWorkspace(wsDir, ws);
    console.log(c.green("removed") + ` tool ${name}`);
    return EXIT.OK;
  }
  let entry;
  try {
    entry = toolEntry(name, {
      server: flagString(flags, "server"), access: flagString(flags, "access"),
      for: flagString(flags, "for"), purpose: flagString(flags, "purpose"),
      only: flags.has("only") ? flagString(flags, "only") ?? "" : undefined,
    }, at >= 0 ? ws.tools[at] : null);
  } catch (err) {
    console.error(c.red("error:") + ` ${err.message}`);
    return EXIT.USAGE;
  }
  if (at >= 0) ws.tools[at] = entry;
  else ws.tools.push(entry);
  writeWorkspace(wsDir, ws);
  console.log(c.green(at >= 0 ? "updated" : "declared") + ` ${entry.name} → MCP server "${entry.server}", ${entry.access === "write" ? "read/write (each write asks the human)" : "read-only"}, for ${(entry.for ?? []).join(", ") || "the planner"}`);
  if (entry.only) console.log(c.gray(`only these calls pass through "${entry.server}": ${entry.only.join(", ")} — every other call is denied`));
  console.log(c.gray(`the server itself is configured in your agent (Cursor: .cursor/mcp.json; Claude Code: .mcp.json) under the name "${entry.server}"`));
  // Said now, not only at the next validate (change 0235): a key that matches
  // no configuration is a guard that never fires.
  const servers = mcpServerNames([wsDir, ...ws.projects.map((p) => p.path)]);
  if (servers.found && !servers.names.has(entry.server)) {
    console.log(c.yellow("warn") + ` no MCP configuration here names a server "${entry.server}" (found: ${[...servers.names].sort().join(", ") || "none"}) — the guard only sees calls through the exact key; rerun with --server <that key>`);
  }
  return EXIT.OK;
}

// Reads the agent's pre-call payload on stdin and answers in the agent's
// own format. Never exits non-zero and never blocks on bad input: a broken
// guard must not take the agent's tools away.

function workspaceList(wsDir) {
  const ws = readWorkspace(wsDir);
  console.log(c.bold(`Workspace "${ws.name}"`) + c.gray(` — ${wsDir}`));
  if (ws.projects.length === 0) {
    console.log("");
    console.log(c.gray("no project yet — `doctrina workspace add <path>`"));
    return EXIT.OK;
  }
  console.log("");
  for (const p of ws.projects) {
    const st = projectState(wsDir, p);
    const colour = st.state === "ready" ? c.green : st.state === "pending" ? c.yellow : c.red;
    const open = st.open.length ? `, ${st.open.length} open change${st.open.length === 1 ? "" : "s"}` : "";
    console.log(`  ${c.cyan(p.name.padEnd(16))} ${p.mode.padEnd(8)} ${colour(st.state.padEnd(8))} ${st.reason}${open}`);
    const meta = [p.role && `role ${p.role}`, p.dependsOn?.length && `depends on ${p.dependsOn.join(", ")}`].filter(Boolean).join(" · ");
    console.log(c.gray(`  ${"".padEnd(16)} ${p.path}${meta ? " · " + meta : ""}`));
    if (p.about) console.log(c.gray(`  ${"".padEnd(16)} ${p.about}`));
  }
  const pending = ws.projects.filter((p) => projectState(wsDir, p).state === "pending");
  if (pending.length > 0) {
    console.log("");
    console.log(`Next: absorb ${pending.map((p) => p.name).join(", ")} — ` + c.cyan(cdThen(pending[0].path, "doctrina intake --from-code")));
  }
  console.log("");
  if (ws.tools.length === 0) {
    // Named generically (change 0228): which tools a team connects is the
    // team's choice, and a hint that names one product reads as the default.
    console.log(c.gray("no tool declared — `doctrina workspace tool <name> --server <mcp-server> --for <roles>` (presets: " + Object.keys(TOOL_PRESETS).join(", ") + ")"));
  } else {
    console.log(c.bold("Tools"));
    for (const t of ws.tools) {
      console.log(`  ${c.cyan(t.name.padEnd(12))} ${t.server.padEnd(12)} ${t.access.padEnd(6)} ${(t.for ?? []).join(", ").padEnd(16)} ${c.gray(t.purpose ?? "")}`);
      if (t.only?.length) console.log(c.gray(`  ${"".padEnd(12)} only: ${t.only.join(", ")}`));
    }
  }
  // The orchestrator files carry what changes without a workspace write — a
  // project absorbed in its own repository turns ready, an executor model
  // edited into workspace.json (change 0228). The hub kept saying "pending"
  // and the subagent kept `model: inherit` until the next add or tool.
  // Listing refreshes them; only a file whose content differs is written.
  regenerate(wsDir);
  return EXIT.OK;
}

export const help = `
Usage: doctrina workspace <init|add|attach|detach|list|tool|guard> [options]

The context of several repositories in one place (ADR 0029). Keep the
workspace directory as a PRIVATE git repository: it versions the
artifacts of repositories that cannot carry .doctrina/ themselves.

  init [<dir>] [--name <n>] [--no-git]
      Create the workspace (workspace.json, projects/, deliveries/) and
      \`git init\` it. Records it in $DOCTRINA_HOME (default ~/.doctrina)
      so an in-repo project can find it.

  add <path> [--name <n>] [--mode in-repo|shadow] [--role <r>]
             [--about "<what it is>"] [--depends-on <a,b>] [--agent cursor]
      Register a repository. One with its own .doctrina/ is in-repo. One
      without is a SHADOW: its AGENTS.md, .doctrina/ and agent adapter are
      scaffolded under projects/<name>/, linked into the repository, and
      hidden from its git through .git/info/exclude.

  attach <name> [--path <dir>] [--depends-on <a,b>]
      Re-create a shadow's links (after cloning the workspace on another
      machine, or with --path after the repository moved). --depends-on
      replaces the projects it builds on — the order \`delivery route\` uses.

  detach <name>
      Remove a shadow's links and its exclude block; the shadow stays.

  list
      Every project with its mode, state (ready / pending / missing) and
      open changes, then the declared tools; refreshes the orchestrator
      files when a project's state or workspace.json changed since.

  tool <name> [--server <mcp-name>] [--access read|write] [--for <roles>]
              [--purpose "<what for>"] [--only "<calls>"] [--remove]
      Declare (or update, or --remove) a tool the work uses. Presets:
      jira, confluence, figma, playwright, datadog, databricks, sql.
      Roles: planner, executor, qa, observer, reviewer. Access defaults
      to read: the guard refuses a write through a read-only tool and
      makes a declared write wait for the human.
      --only "getJiraIssue,search*" lists the calls the tool may make,
      by MCP tool name (\`*\` for any run of characters): every other
      call through its server is denied, instead of being judged by the
      verb in its name. --only none takes the list away.

  guard --hook cursor|claude
      The pre-call hook the workspace installs (Cursor beforeMCPExecution,
      Claude Code PreToolUse): reads the call on stdin and answers allow,
      deny or ask from the declared access. Never blocks on bad input.

Every write (init, add, attach, detach, tool) and every list regenerates
the orchestrator files at the workspace root: AGENTS.md,
.cursor/rules/00-doctrina-workspace.mdc, .cursor/hooks.json and
.claude/settings.json (merged), .claude/agents/doctrina-*.md (read by
Claude Code and Cursor) and <name>.code-workspace, which opens every
repository in one window.

The workspace is found from $DOCTRINA_WORKSPACE, the current directory
or an ancestor holding ${WORKSPACE_FILE}, a shadow's .doctrina link, or
the pointer \`init\` wrote.
`;

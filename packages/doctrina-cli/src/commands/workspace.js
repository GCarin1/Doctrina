// @ts-check
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
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

// `doctrina workspace` — the context of several repositories in one place
// (ADR 0029). The decisions live in lib/workspace.js; this module renders
// them and runs the one child process it needs (`init` inside a shadow).

const SUBCOMMANDS = ["init", "add", "attach", "detach", "list"];
const CLI_ENTRY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "index.js");

export const flags = {
  boolean: ["json", "no-git"],
  string: ["name", "mode", "role", "about", "depends-on", "agent", "path"],
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
  if (!found) {
    throw new PreconditionError(
      "no workspace here (no workspace.json in this directory or above, and $DOCTRINA_WORKSPACE is unset)",
      "doctrina workspace init <dir>",
    );
  }
  if (sub === "add") return workspaceAdd(found.dir, positional[1], flags);
  if (sub === "attach") return workspaceAttach(found.dir, positional[1], flags);
  if (sub === "detach") return workspaceDetach(found.dir, positional[1]);
  return workspaceList(found.dir);
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
  if (mode === "shadow") {
    const shadow = shadowDirOf(wsDir, name);
    if (!isDir(path.join(shadow, ".doctrina"))) {
      mkdirp(shadow);
      const agent = flagString(flags, "agent") ?? "cursor";
      const r = spawnSync(process.execPath, [CLI_ENTRY, "init", "--non-interactive",
        "--project-name", name, "--project-description", project.about || `${name} (absorbed into a workspace)`,
        "--agent", agent], { cwd: shadow, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
      if (r.status !== 0) {
        console.error(c.red("error:") + ` could not scaffold the shadow at ${shadow}`);
        console.error(r.stderr.trim());
        return EXIT.GATE;
      }
      console.log(c.green("created") + ` shadow ${relPath(wsDir, shadow)}/ (AGENTS.md, .doctrina/, ${agent} adapter)`);
    }
  }
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
    console.log("  " + c.cyan(`cd ${project.path} && doctrina intake --from-code`));
  }
}

function findProject(ws, name) {
  const project = ws.projects.find((p) => p.name === name);
  if (project) return project;
  const guess = suggest(name ?? "", ws.projects.map((p) => p.name));
  throw Object.assign(new Error(`no project named "${name ?? ""}" in this workspace` + (guess ? ` — did you mean "${guess}"?` : "")), { exitCode: EXIT.USAGE });
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
  if (project.mode !== "shadow") {
    console.log(c.gray(`${project.name} is in-repo — its .doctrina/ is its own; nothing to link`));
    return EXIT.OK;
  }
  if (!isDir(project.path)) {
    console.error(c.red("error:") + ` ${project.name}'s repository is not at ${project.path}`);
    console.error(c.gray("hint: ") + `point it at the clone: \`doctrina workspace attach ${project.name} --path <dir>\``);
    return EXIT.PRECONDITION;
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
    console.log(`Next: absorb ${pending.map((p) => p.name).join(", ")} — ` + c.cyan(`cd ${pending[0].path} && doctrina intake --from-code`));
  }
  return EXIT.OK;
}

export const help = `
Usage: doctrina workspace <init|add|attach|detach|list> [options]

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

  attach <name> [--path <dir>]
      Re-create a shadow's links (after cloning the workspace on another
      machine, or with --path after the repository moved).

  detach <name>
      Remove a shadow's links and its exclude block; the shadow stays.

  list
      Every project with its mode, state (ready / pending / missing) and
      open changes. A pending project still has to be absorbed.

The workspace is found from $DOCTRINA_WORKSPACE, the current directory
or an ancestor holding ${WORKSPACE_FILE}, a shadow's .doctrina link, or
the pointer \`init\` wrote.
`;

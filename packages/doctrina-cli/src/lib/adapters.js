// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { exists, isDir, isFile, read, relPath, walk } from "./fs-ops.js";
import { locateTemplatesDir, substitute } from "./templates.js";

// Agent adapters: the thin per-agent files that point at AGENTS.md.
//
// Installing one used to be reachable ONLY through a full `doctrina init`
// run, and `init` refuses to run twice — so `init --force` was the only
// path, and it regenerated AGENTS.md and product.md from blank templates,
// destroying every hand-authored rule and the entire product definition
// with no warning (audit item C1, data loss). This module owns adapters as
// their own concern so adding one can be strictly additive.
//
// Three states, which the old surface could not tell apart:
//   installed      — the adapter's files are present in the project
//   available      — the adapter ships files and none are installed
//   native         — the agent reads AGENTS.md directly and needs no file
//                    (its template dir carries only a README)

export const ADAPTER_STATES = Object.freeze({
  INSTALLED: "installed",
  AVAILABLE: "available",
  NATIVE: "native",
});

// Where a named adapter's templates live. A project-local adapter under
// `.doctrina/templates/adapters/<name>/` wins over the bundled one, so a
// team can ship an adapter for an agent Doctrina does not know about.
export function resolveAdapterDir(projectRoot, name) {
  const local = path.join(projectRoot, ".doctrina", "templates", "adapters", name);
  if (isDir(local) && walk(local).length > 0) return { dir: local, source: "project" };
  const bundledRoot = path.join(locateTemplatesDir(), "adapters");
  const bundled = path.join(bundledRoot, name);
  if (isDir(bundled)) return { dir: bundled, source: "bundled" };
  return null;
}

// Every adapter name known to this project: bundled plus project-local.
export function listAdapterNames(projectRoot) {
  const names = new Set();
  try {
    const bundledRoot = path.join(locateTemplatesDir(), "adapters");
    if (isDir(bundledRoot)) {
      for (const e of readdirSync(bundledRoot)) {
        if (isDir(path.join(bundledRoot, e))) names.add(e);
      }
    }
  } catch { /* unusual install without a templates dir */ }
  const localRoot = path.join(projectRoot, ".doctrina", "templates", "adapters");
  if (isDir(localRoot)) {
    for (const e of readdirSync(localRoot)) {
      if (isDir(path.join(localRoot, e))) names.add(e);
    }
  }
  return [...names].sort();
}

// The files a named adapter would write, as project-relative POSIX paths
// paired with their template source. A README inside the adapter template
// dir documents the adapter and is never materialised.
export function adapterFiles(projectRoot, name) {
  const resolved = resolveAdapterDir(projectRoot, name);
  if (!resolved) return null;
  const out = [];
  for (const templatePath of walk(resolved.dir)) {
    const rel = relPath(resolved.dir, templatePath).replace(/\\/g, "/");
    if (rel === "README.md" || rel.endsWith(".gitkeep")) continue;
    out.push({
      templatePath,
      relativePath: rel.replace(/\.template$/, ""),
    });
  }
  return { source: resolved.source, files: out.sort((a, b) => a.relativePath.localeCompare(b.relativePath)) };
}

// Adapter state plus the files backing it, for `adapter list`.
export function describeAdapter(projectRoot, name) {
  const spec = adapterFiles(projectRoot, name);
  if (!spec) return { name, state: ADAPTER_STATES.AVAILABLE, source: "unknown", files: [], installed: [] };
  if (spec.files.length === 0) {
    // Reads AGENTS.md natively — "no adapter installed" and "no adapter
    // needed" were indistinguishable before this distinction existed.
    return { name, state: ADAPTER_STATES.NATIVE, source: spec.source, files: [], installed: [] };
  }
  const installed = spec.files.filter((f) => isFile(path.join(projectRoot, f.relativePath)));
  return {
    name,
    source: spec.source,
    files: spec.files,
    installed,
    state: installed.length > 0 ? ADAPTER_STATES.INSTALLED : ADAPTER_STATES.AVAILABLE,
  };
}

// The AGENTS.md path an adapter file should point at, relative to its own
// location — a nested command file needs "../../AGENTS.md".
export function agentsMdPathFor(relativePath) {
  const depth = relativePath.split("/").length - 1;
  return depth === 0 ? "AGENTS.md" : "../".repeat(depth) + "AGENTS.md";
}

// Is this adapter file a HUB POINTER — a file whose job is to route the
// agent at AGENTS.md?
//
// Declared by the template itself: a template that uses the
// {{AGENTS_MD_PATH}} token is saying "I point at the hub". Everything else
// is a command shim — a Claude/Cursor slash command like `/doctrina-status`
// whose job is to invoke the CLI, and which reaches the hub through its
// parent CLAUDE.md rather than by naming it.
//
// This distinction is the fix for audit item C2: the pointer check demanded
// the literal string "AGENTS.md" in EVERY adapter file, so a clean
// `init --agent claude` failed `templates check` on four command shims that
// were never pointers, and neither suggested remedy could clear it.
export function isHubPointer(file) {
  return read(file.templatePath).includes("{{AGENTS_MD_PATH}}");
}

// Render one adapter file's body for this project.
export function renderAdapterFile(file, tokens) {
  return substitute(read(file.templatePath), {
    ...tokens,
    AGENTS_MD_PATH: agentsMdPathFor(file.relativePath),
  });
}

// Is this project-relative path one that some adapter owns? Used by
// `adapter remove` so it deletes only what an adapter created, and by
// `init` so it never counts adapter files as user content.
export function isAdapterOwnedPath(projectRoot, relPathPosix) {
  for (const name of listAdapterNames(projectRoot)) {
    const spec = adapterFiles(projectRoot, name);
    if (spec?.files.some((f) => f.relativePath === relPathPosix)) return true;
  }
  return false;
}

export { exists };

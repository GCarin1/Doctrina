// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";
import { read, toPosix, walk, write } from "./fs-ops.js";

// Resolve the path to the .doctrina/templates/ directory shipped with this
// package. The package layout is:
//   packages/doctrina-cli/src/lib/templates.js     (this file)
//   .doctrina/templates/                            (when running from a source checkout)
//
// When installed via npm, the package will ship a copy of templates alongside
// src/. The resolver below tries the local source first, then a packaged copy.

const here = path.dirname(fileURLToPath(import.meta.url));

export function locateTemplatesDir() {
  const candidates = [
    // running from source checkout: ../../../../.doctrina/templates
    path.resolve(here, "..", "..", "..", "..", ".doctrina", "templates"),
    // installed package layout: ../../templates
    path.resolve(here, "..", "..", "templates"),
  ];
  for (const candidate of candidates) {
    try {
      // statSync via fs-ops without importing it twice
      const test = path.join(candidate, "README.md");
      // dynamic check using read (throws if missing)
      read(test);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error(
    `cannot locate .doctrina/templates/. Tried: ${candidates.join(", ")}`,
  );
}

// ---------------------------------------------------------------------------
// The project-local override chain (audit item M1).
//
// `doctrina init` creates `.doctrina/templates/` containing a single
// `.gitkeep`, and nothing ever read it or wrote to it. The resolver above
// answers only "where did the CLI install its templates?", so a directory
// the framework creates in every project was inert — a ghost.
//
// Resolution is now a CHAIN, per file: a template present under the
// project's `.doctrina/templates/` wins; anything absent falls back to the
// bundled copy. That turns the ghost into the customisation point, and it
// is the same wiring the custom-adapter support needs (ADR 0016).
//
// Deliberately per FILE, not per directory: a team that wants its own
// `spec.md.template` should not have to vendor the whole tree and then
// maintain every other template forever.

export function projectTemplatesDir(projectRoot) {
  return path.join(projectRoot, ".doctrina", "templates");
}

// Where a named template resolves for this project.
// Returns { path, source: "project" | "bundled" } or null when neither has
// it. `relativePath` is POSIX-ish and relative to a templates root, e.g.
// "spec.md.template" or "change/proposal.md.template".
export function resolveTemplate(projectRoot, relativePath) {
  const rel = relativePath.split("/").join(path.sep);
  if (projectRoot) {
    const local = path.join(projectTemplatesDir(projectRoot), rel);
    if (fileExists(local)) return { path: local, source: "project" };
  }
  try {
    const bundled = path.join(locateTemplatesDir(), rel);
    if (fileExists(bundled)) return { path: bundled, source: "bundled" };
  } catch { /* no bundled tree (unusual install) */ }
  return null;
}

// Read a template through the chain. Throws with both candidates named
// when neither side has it, because "template not found" with no path is
// the least actionable error a scaffolder can give.
export function readTemplate(projectRoot, relativePath) {
  const resolved = resolveTemplate(projectRoot, relativePath);
  if (!resolved) {
    throw new Error(
      `template "${relativePath}" not found in the project override ` +
      `(${projectTemplatesDir(projectRoot)}) or in the installed CLI`,
    );
  }
  return { ...resolved, body: read(resolved.path) };
}

// Every template the chain can serve, with where each one resolved from —
// what `templates list` prints so the source is never a guess.
export function listResolvedTemplates(projectRoot) {
  const seen = new Map();
  let bundledRoot = null;
  try {
    bundledRoot = locateTemplatesDir();
  } catch { /* none */ }

  if (bundledRoot) {
    for (const f of walk(bundledRoot)) {
      const rel = toPosix(path.relative(bundledRoot, f));
      seen.set(rel, { relativePath: rel, path: f, source: "bundled" });
    }
  }
  const localRoot = projectRoot ? projectTemplatesDir(projectRoot) : null;
  if (localRoot) {
    for (const f of walk(localRoot)) {
      const rel = toPosix(path.relative(localRoot, f));
      if (rel === ".gitkeep") continue;
      const overrides = seen.has(rel);
      seen.set(rel, { relativePath: rel, path: f, source: "project", overrides });
    }
  }
  return [...seen.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function fileExists(p) {
  try {
    read(p);
    return true;
  } catch {
    return false;
  }
}

// Single-pass {{TOKEN}} substitution. Tokens are uppercase, digits, or
// underscore inside double curly braces.
export function substitute(text, tokens) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(tokens, name)) {
      return String(tokens[name]);
    }
    return match;
  });
}

// Scan a template body for required tokens (every {{TOKEN}} occurrence).
export function discoverTokens(text) {
  const set = new Set();
  for (const m of text.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) set.add(m[1]);
  return [...set].sort();
}

// Walk a template subdirectory and return an array of
// { templatePath, relativePath, body } entries, suitable for substitution.
export function loadTemplateTree(templatesDir, subdir) {
  const root = path.join(templatesDir, subdir);
  const files = walk(root);
  return files.map((templatePath) => {
    const relativePath = toPosix(path.relative(root, templatePath));
    const body = templatePath.endsWith(".gitkeep") ? "" : read(templatePath);
    return { templatePath, relativePath, body };
  });
}

// Materialise a template entry into a destination directory. If the relative
// path ends in ".template", the suffix is stripped on write.
export function materialiseEntry(entry, destDir, tokens, opts = {}) {
  const cleaned = entry.relativePath.replace(/\.template$/, "");
  const destPath = path.join(destDir, cleaned);
  const body = entry.templatePath.endsWith(".gitkeep")
    ? ""
    : substitute(entry.body, tokens);
  write(destPath, body, opts);
  return destPath;
}

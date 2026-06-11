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

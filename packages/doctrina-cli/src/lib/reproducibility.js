// @ts-check
// The clean-checkout reproducibility lint, as a collection rather than a
// printout: "would a fresh clone of this repository actually build?"
//
// It lives here because two commands ask it — `verify --clean` renders it,
// and `doctor` reports it as one row. `doctor` used to answer by spawning
// the CLI again and reading its exit code, which is a second integration
// style inside one binary and a process per row (audit finding F4).
import path from "node:path";
import { readdirSync } from "node:fs";
import { read, relPath } from "./fs-ops.js";

/**
 * Static reproducibility lint: walk the project's package.json files and
 * report the two "works on my machine" footguns the review hit — a package
 * whose entry points live in a build-output dir with nothing that builds it
 * on install, and a codegen dependency (Prisma) with no install hook that
 * generates. A pure read: it returns what it found and prints nothing, so
 * `verify --clean` renders it and `doctor` reports it as one row without
 * spawning the CLI again to read its exit code (audit finding F4).
 *
 * @param {string} projectRoot
 * @returns {{packages: number, findings: string[]}}
 */
export function collectReproducibility(projectRoot) {
  const pkgPaths = findPackageJsons(projectRoot);
  const findings = [];
  for (const pkgPath of pkgPaths) {
    const rel = relPath(projectRoot, pkgPath);
    let pkg;
    try {
      pkg = JSON.parse(read(pkgPath));
    } catch (err) {
      findings.push(`${rel}: not valid JSON (${err.message})`);
      continue;
    }
    const scripts = pkg.scripts ?? {};
    const hasInstallBuild = typeof scripts.prepare === "string" || typeof scripts.prepack === "string";

    // 1. Entry point into a build output with nothing to build it on install.
    const built = entryIntoBuildDir(pkg);
    if (built && !hasInstallBuild) {
      findings.push(
        `${rel}: ${built.field} → \`${built.value}\` is a build output, but no "prepare"/"prepack" ` +
        `script builds it on install — a fresh install/clone won't have it (add a prepare script, or commit the output)`,
      );
    }

    // 2. Codegen dependency with no install hook that generates.
    const deps = {
      ...pkg.dependencies, ...pkg.devDependencies,
      ...pkg.peerDependencies, ...pkg.optionalDependencies,
    };
    for (const [dep, gen] of Object.entries(CODEGEN_DEPS)) {
      if (!(dep in deps)) continue;
      const installHook = `${scripts.postinstall ?? ""} ${scripts.prepare ?? ""}`;
      if (!gen.test(installHook)) {
        findings.push(
          `${rel}: depends on "${dep}" but no "postinstall"/"prepare" runs its codegen ` +
          `(\`${gen.source.replace(/\\s\+/g, " ")}\`) — a fresh install has no generated output`,
        );
      }
    }
  }

  return { packages: pkgPaths.length, findings };
}

// Known codegen dependencies → the command an install hook must run so a
// fresh install produces their generated output.
const CODEGEN_DEPS = {
  "@prisma/client": /prisma\s+generate/,
  "prisma": /prisma\s+generate/,
};

const BUILD_DIR_RE = /(?:^|\/)(?:dist|build|out)\//;

// The first entry-point field that points into a build-output directory, or
// null. Scans main/module/types/typings, bin (string or map), and exports
// (recursively, string leaves only).
function entryIntoBuildDir(pkg) {
  for (const field of ["main", "module", "types", "typings"]) {
    if (typeof pkg[field] === "string" && BUILD_DIR_RE.test(pkg[field])) {
      return { field, value: pkg[field] };
    }
  }
  if (typeof pkg.bin === "string" && BUILD_DIR_RE.test(pkg.bin)) return { field: "bin", value: pkg.bin };
  if (pkg.bin && typeof pkg.bin === "object") {
    for (const v of Object.values(pkg.bin)) {
      if (typeof v === "string" && BUILD_DIR_RE.test(v)) return { field: "bin", value: v };
    }
  }
  const fromExports = scanExports(pkg.exports);
  if (fromExports) return { field: "exports", value: fromExports };
  return null;
}

function scanExports(node) {
  if (typeof node === "string") return BUILD_DIR_RE.test(node) ? node : null;
  if (node && typeof node === "object") {
    for (const v of Object.values(node)) {
      const hit = scanExports(v);
      if (hit) return hit;
    }
  }
  return null;
}

// Bounded walk for package.json files: skip dependency, build, and VCS
// directories so the lint stays fast and ignores vendored manifests.
const LINT_SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "out", "vendor", ".next",
  "coverage", ".venv", "venv", "__pycache__", "target", ".doctrina",
]);

function findPackageJsons(projectRoot) {
  const found = [];
  const stack = [projectRoot];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!LINT_SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) stack.push(full);
      } else if (entry.name === "package.json") {
        found.push(full);
      }
    }
  }
  return found.sort();
}

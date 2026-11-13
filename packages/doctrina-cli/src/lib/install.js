// @ts-check
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, realpathSync } from "node:fs";

// WHICH `doctrina` A TERMINAL RUNS (change 0243).
//
// The hooks the adapters write call `doctrina` by name, so they run whatever
// the PATH finds first — and a machine with two Node versions, or an npm
// prefix that moved, holds two installs. `npm install -g` updated one, the
// PATH still found the other, and `doctrina --version` answered the old
// number while the registry and the package both said the new one. Nothing
// in the CLI could say so: it only knew its own version.

const here = path.dirname(fileURLToPath(import.meta.url));
const real = (/** @type {string} */ p) => {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
};
const versionAt = (/** @type {string} */ pkgDir) => {
  try {
    const pkg = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
    return pkg.name === "doctrina-cli" ? String(pkg.version ?? "") : null;
  } catch {
    return null;
  }
};

/** The package directory of the CLI that is running. */
export function runningPackageDir() {
  return real(path.resolve(here, "..", "..")) ?? path.resolve(here, "..", "..");
}

/**
 * The package a `doctrina` found in `dir` belongs to: through the symlink npm
 * writes on POSIX, or beside the `.cmd` shim it writes on Windows.
 * @returns {{ bin: string, pkgDir: string | null, version: string | null } | null}
 */
function installIn(dir, platform) {
  const names = platform === "win32" ? ["doctrina.cmd", "doctrina.ps1", "doctrina"] : ["doctrina"];
  const bin = names.map((n) => path.join(dir, n)).find((p) => existsSync(p));
  if (!bin) return null;
  const candidates = [];
  const target = real(bin);
  // npm on POSIX: bin/doctrina -> ../lib/node_modules/doctrina-cli/src/index.js
  if (target && target !== bin) candidates.push(path.resolve(path.dirname(target), ".."));
  candidates.push(path.join(dir, "node_modules", "doctrina-cli"));           // npm on Windows, and a project's .bin
  candidates.push(path.join(dir, "..", "doctrina-cli"));                     // node_modules/.bin
  candidates.push(path.join(dir, "..", "lib", "node_modules", "doctrina-cli")); // a POSIX shim that is not a link
  for (const c of candidates) {
    const version = versionAt(c);
    if (version !== null) return { bin, pkgDir: real(c) ?? c, version };
  }
  return { bin, pkgDir: null, version: null };
}

/**
 * Every `doctrina` the PATH holds, in the order a shell would find them, one
 * per package. The first is the one a bare `doctrina` runs.
 * @returns {{ bin: string, pkgDir: string | null, version: string | null, running: boolean }[]}
 */
export function installsOnPath(env = process.env, platform = process.platform) {
  const sep = platform === "win32" ? ";" : ":";
  const running = runningPackageDir();
  const seen = new Set();
  const out = [];
  for (const dir of String(env.PATH ?? env.Path ?? "").split(sep).filter(Boolean)) {
    const found = installIn(dir, platform);
    if (!found) continue;
    const key = found.pkgDir ?? found.bin;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...found, running: found.pkgDir === running });
  }
  return out;
}

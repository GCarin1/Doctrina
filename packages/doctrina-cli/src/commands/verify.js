import path from "node:path";
import process from "node:process";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { exists, isDir, isFile, read, write, relPath } from "../lib/fs-ops.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";

// The build/verify gate `validate` is not. `validate` checks the shape of
// the artifact tree; it never runs the project, so a repo that does not
// compile still "passes". `verify` closes that hole: it executes the
// project-declared checks (typecheck / test / build) and fails when any
// of them fails. Doctrina is language-agnostic and ships zero runtime
// deps, so it cannot know your build — you declare it in
// `.doctrina/verify.json`, and `verify` runs exactly that, in order.

const CONFIG_REL = ".doctrina/verify.json";

const STARTER = {
  $comment:
    "doctrina verify runs each check below, in order, through your shell. " +
    "Replace the example with your real typecheck/test/build commands. A " +
    "non-zero exit fails the gate. This file is the project's executable " +
    "definition of 'the code actually works'.",
  checks: [
    { name: "example", run: "exit 1" },
  ],
};

export async function run(_positional, flags) {
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  // --clean is the reproducibility lint (review G4): `verify` runs the
  // declared checks against the *current* disk, so a repo that only works
  // because a previous run generated a Prisma client or built a workspace's
  // dist still passes — "verify green" ≠ "passes from a clean checkout".
  // This is the static half of that gap: it flags the footguns that make a
  // fresh `npm install` differ from the dirty machine, without doing a real
  // (slow, package-manager-specific) clean install.
  if (flagBool(flags, "clean", false)) {
    return reproducibilityLint(projectRoot);
  }

  const configPath = path.join(projectRoot, CONFIG_REL);

  // --init scaffolds a starter config so the gate is one edit away.
  if (flagBool(flags, "init", false)) {
    const force = flagBool(flags, "force", false);
    if (isFile(configPath) && !force) {
      console.error(c.red("error:") + ` ${CONFIG_REL} already exists (pass --force to overwrite)`);
      return 1;
    }
    write(configPath, JSON.stringify(STARTER, null, 2) + "\n", { force: true });
    console.log(c.green("created") + ` ${CONFIG_REL}`);
    console.log(c.gray("Edit the `checks` array with your real commands, then run `doctrina verify`."));
    return 0;
  }

  if (!isFile(configPath)) {
    // A verify gate with nothing configured would pass vacuously — exactly
    // the false confidence this command exists to prevent. Fail loudly.
    console.error(c.red("error:") + ` no ${CONFIG_REL} — nothing to verify`);
    console.error(c.gray("hint: ") + "scaffold one with `doctrina verify --init`, then declare your typecheck/test/build commands");
    return 1;
  }

  let config;
  try {
    config = JSON.parse(read(configPath));
  } catch (err) {
    console.error(c.red("error:") + ` ${CONFIG_REL} is not valid JSON: ${err.message}`);
    return 1;
  }
  const checks = Array.isArray(config?.checks) ? config.checks : null;
  if (!checks) {
    console.error(c.red("error:") + ` ${CONFIG_REL} must contain a "checks" array of { name, run }`);
    return 1;
  }
  for (const ch of checks) {
    if (!ch || typeof ch.run !== "string" || ch.run.trim() === "") {
      console.error(c.red("error:") + ` every check in ${CONFIG_REL} needs a non-empty "run" string`);
      return 1;
    }
  }
  if (checks.length === 0) {
    console.error(c.red("error:") + ` ${CONFIG_REL} declares zero checks — a verify gate with no checks proves nothing`);
    return 1;
  }

  // --list prints the configured checks without running them.
  if (flagBool(flags, "list", false)) {
    console.log(c.bold("Verify checks") + c.gray(` (from ${CONFIG_REL}):`));
    console.log("");
    checks.forEach((ch, i) => {
      console.log(`  ${i + 1}. ${c.cyan((ch.name ?? "check").padEnd(16))} ${c.gray(ch.run)}`);
    });
    return 0;
  }

  console.log(c.bold("doctrina verify") + c.gray(` — ${checks.length} check${checks.length === 1 ? "" : "s"} from ${CONFIG_REL}`));
  const results = [];
  for (const ch of checks) {
    const name = ch.name ?? "check";
    console.log("");
    const where = ch.cwd ? c.gray(` [${ch.cwd}]`) : "";
    console.log(c.gray(`──── ${name}: `) + ch.run + where);
    // Run through the shell so declared commands can use pipes, &&, env,
    // and platform builtins. stdio is inherited so the operator sees the
    // real output — verify shows the truth, it does not summarise it away.
    // An optional per-check `cwd` (relative to the project root) lets a
    // monorepo target a sub-package, e.g. { run: "node --test", cwd:
    // "packages/api" } — the multi-service shape the contract artifact
    // also serves.
    const res = spawnSync(ch.run, {
      cwd: ch.cwd ? path.resolve(projectRoot, ch.cwd) : projectRoot,
      shell: true,
      stdio: "inherit",
    });
    const ok = !res.error && res.status === 0;
    if (res.error) {
      console.log(c.red(`✗ ${name}`) + c.gray(` — could not run: ${res.error.message}`));
    } else {
      console.log(ok ? c.green(`✓ ${name}`) : c.red(`✗ ${name} (exit ${res.status})`));
    }
    results.push({ name, ok });
    // Fail fast is tempting, but running every check surfaces all breakage
    // in one pass — more useful for an agent fixing the gap.
  }

  const passed = results.filter((r) => r.ok).length;
  console.log("");
  if (passed === results.length) {
    console.log(c.green("ok") + ` ${passed}/${results.length} checks passed`);
    return 0;
  }
  const failed = results.filter((r) => !r.ok).map((r) => r.name).join(", ");
  console.log(c.red("fail") + ` ${passed}/${results.length} checks passed — failed: ${failed}`);
  return 1;
}

// Static reproducibility lint: walk the project's package.json files and
// report the two "works on my machine" footguns the review hit — a package
// whose entry points live in a build-output dir with nothing that builds it
// on install, and a codegen dependency (Prisma) with no install hook that
// generates. Returns 0 when clean, 1 when any risk is found. Pure read.
function reproducibilityLint(projectRoot) {
  const pkgPaths = findPackageJsons(projectRoot);
  console.log(c.bold("doctrina verify --clean") + c.gray(" — reproducibility lint (static, not a real fresh install)"));
  console.log("");

  if (pkgPaths.length === 0) {
    console.log(c.gray("no package.json found — nothing this lint can check (it knows Node/npm footguns)"));
    return 0;
  }

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

  if (findings.length === 0) {
    console.log(c.green("ok") + ` ${pkgPaths.length} package.json file${pkgPaths.length === 1 ? "" : "s"} — no reproducibility risks found`);
    return 0;
  }
  for (const f of findings) console.log(`  ${c.yellow("!")} ${f}`);
  console.log("");
  console.log(c.red("fail") + ` ${findings.length} reproducibility risk${findings.length === 1 ? "" : "s"} — a clean checkout may not build`);
  return 1;
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

export const help = `
Usage: doctrina verify [--list] [--init] [--clean] [--force]

Run the project-declared build/verify checks from ${CONFIG_REL} in order,
streaming their output, and exit non-zero if any check fails. This is the
real "does the code work" gate, separate from the structural \`validate\`.

${CONFIG_REL} shape (an optional per-check "cwd", relative to the project
root, targets a sub-package in a monorepo):
  {
    "checks": [
      { "name": "typecheck", "run": "tsc --noEmit", "cwd": "packages/api" },
      { "name": "test",      "run": "npm test" },
      { "name": "build",     "run": "npm run build" }
    ]
  }

Flags:
  --init     Scaffold a starter ${CONFIG_REL} (refuses to overwrite without --force)
  --list     Print the configured checks without running them
  --clean    Don't run checks; lint the project's package.json files for
             reproducibility footguns (entry points in a build dir with no
             prepare/prepack; a Prisma dep with no generate on install) so
             "verify green" can't hide a clean checkout that won't build.
  --force    With --init, overwrite an existing config
`;

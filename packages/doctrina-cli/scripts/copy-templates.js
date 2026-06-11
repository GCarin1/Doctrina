#!/usr/bin/env node
// prepack hook: copy the canonical templates tree (.doctrina/templates/ at the
// repo root) into packages/doctrina-cli/templates/ so the published tarball
// contains them. Runs immediately before `npm pack`/`npm publish`. The copied
// directory is gitignored; the source of truth lives at the repo root.

import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const repoRoot = path.resolve(pkgRoot, "..", "..");
const source = path.join(repoRoot, ".doctrina", "templates");
const target = path.join(pkgRoot, "templates");

if (!existsSync(source)) {
  console.error(`prepack: source ${source} does not exist`);
  process.exit(1);
}

if (existsSync(target)) rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`prepack: copied templates from ${source} to ${target}`);

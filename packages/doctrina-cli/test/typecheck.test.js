// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// M5. TypeScript is a CHECKER here, never a build step: the package ships
// plain ESM that node runs directly, and `noEmit` is what keeps that true.
// These tests hold that arrangement in place — a stray `emit`, a file that
// quietly loses its pragma, or a type dependency leaking into the tarball
// would each undo it silently.

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const repoRoot = path.resolve(pkgRoot, "..", "..");

function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".js")) out.push(p);
    }
  };
  walk(path.join(pkgRoot, "src"));
  return out;
}

test("every source file under src/ is checked", () => {
  // `checkJs` in tsconfig already covers these. The per-file pragma is what
  // keeps a file checked in an editor that does not load the project
  // tsconfig — which is where most of this code is actually read.
  const missing = [];
  for (const file of sourceFiles()) {
    const head = readFileSync(file, "utf8").slice(0, 300);
    if (!/^\/\/\s*@ts-check\s*$/m.test(head)) {
      missing.push(path.relative(repoRoot, file).replace(/\\/g, "/"));
    }
  }
  assert.deepEqual(missing, [], `files without // @ts-check:\n${missing.join("\n")}`);
});

test("the entrypoint's shebang is still the first byte", () => {
  // Adding the pragma to every file once displaced it, which breaks
  // `doctrina` as an executable while leaving `node src/index.js` fine —
  // so nothing else in this suite would have noticed.
  const text = readFileSync(path.join(pkgRoot, "src", "index.js"), "utf8");
  assert.ok(text.startsWith("#!/usr/bin/env node"), "src/index.js must start with the shebang");
  assert.match(text.split("\n")[1] ?? "", /@ts-check/, "the pragma belongs on line 2");
});

test("the typecheck emits nothing and declares no runtime dependency", () => {
  const tsconfig = JSON.parse(
    readFileSync(path.join(repoRoot, "tsconfig.json"), "utf8").replace(/^\s*\/\/.*$/gm, ""),
  );
  assert.equal(tsconfig.compilerOptions.noEmit, true, "noEmit is what keeps this a checker");
  assert.equal(tsconfig.compilerOptions.checkJs, true);
  assert.equal(tsconfig.compilerOptions.allowJs, true);

  const pkg = JSON.parse(readFileSync(path.join(pkgRoot, "package.json"), "utf8"));
  const deps = pkg.dependencies ?? {};
  assert.deepEqual(Object.keys(deps), [], "the CLI ships zero runtime dependencies");
  // The tarball carries no tsconfig and no .d.ts: they live at the repo root.
  assert.deepEqual(pkg.files, ["src", "templates", "README.md"]);
});

test("the declared verification runs the typecheck before the tests", () => {
  const verify = JSON.parse(readFileSync(path.join(repoRoot, ".doctrina", "verify.json"), "utf8"));
  const names = verify.checks.map((/** @type {{name: string}} */ c) => c.name);
  assert.ok(names.includes("typecheck"), "verify.json must run the typecheck");
  assert.ok(names.indexOf("typecheck") < names.indexOf("test"),
    "the cheapest gate, and the one whose failures explain the rest, goes first");
});

test("tsc reports no errors", { timeout: 180000 }, () => {
  const res = spawnSync("npx", ["tsc", "--noEmit"], {
    cwd: repoRoot, encoding: "utf8", shell: process.platform === "win32",
  });
  if (res.error || res.status === null) {
    // No local TypeScript (a fresh clone that skipped devDependencies) is
    // not a test failure — CI installs them and the gate runs there.
    return;
  }
  assert.equal(res.status, 0, `tsc reported errors:\n${res.stdout}`);
});

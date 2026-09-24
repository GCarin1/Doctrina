// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { projectName } from "../src/lib/project.js";

// A PROJECT HAS ONE NAME, AND EVERY SURFACE READS IT FROM THE SAME PLACE.
//
// Four modules asked "what is this project called" privately, and one of them
// answered differently: `adapter` read the DIRECTORY and never the record. So
// `doctrina init --project-name "Minha Carteira" --agent claude` greeted the
// agent correctly, while `doctrina adapter add cursor` — the very command the
// listing tells you to run to add a second agent — wrote the folder's name
// into every file it installed.
//
// Same templates, same tokens, two callers, two answers. The adapter files are
// an adopter's first contact with the framework, and they were introducing the
// wrong project.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const srcDir = path.resolve(here, "..", "src");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

// A directory whose name is NOT the project name, so the two can be told apart.
function project(extra = []) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-nome-"));
  const r = runCli(["init", "--non-interactive", "--project-name", "Minha Carteira", ...extra], dir);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return dir;
}

const installedText = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === ".doctrina" || e.name === "node_modules") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(md|mdc)$|^\.windsurfrules$/.test(e.name)) out.push([full, readFileSync(full, "utf8")]);
    }
  };
  walk(dir);
  return out;
};

test("adapter add names the project, not the directory it sits in", () => {
  const dir = project();
  try {
    assert.equal(runCli(["adapter", "add", "cursor"], dir).status, 0);
    const files = installedText(dir).filter(([p]) => p.includes(".cursor"));
    assert.ok(files.length >= 2, "precondition: the adapter installed files");
    const named = files.filter(([, text]) => text.includes("Minha Carteira"));
    assert.ok(named.length > 0, "at least one installed file greets the project by name");
    for (const [p, text] of files) {
      assert.ok(!new RegExp(`\\b${path.basename(dir)}\\b`).test(text),
        `${path.relative(dir, p)} names the directory instead of the project`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The two callers of the same templates must not disagree.
test("init --agent and adapter add write the same name", () => {
  const a = project(["--agent", "claude"]);
  const b = project();
  try {
    assert.equal(runCli(["adapter", "add", "claude"], b).status, 0);
    const pick = (dir) => readFileSync(
      path.join(dir, ".claude", "commands", "doctrina-status.md"), "utf8");
    const nameOf = (text) => /health of \*\*([^*]+)\*\*/.exec(text)?.[1];
    assert.equal(nameOf(pick(a)), "Minha Carteira", "init --agent must use the recorded name");
    assert.equal(nameOf(pick(b)), nameOf(pick(a)),
      "the same templates through two callers must produce the same name");
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("a tree with no recorded name falls back to its directory", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-semnome-"));
  try {
    assert.equal(projectName(dir), path.basename(dir), "no index at all");
    assert.equal(projectName(dir, {}), path.basename(dir), "an index that records none");
    assert.equal(projectName(dir, { project: "Registrado" }), "Registrado");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The question has one author now; a fifth private copy is how it drifted.
test("no module resolves the project name on its own", () => {
  const offenders = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith(".js")) continue;
      if (full.endsWith(path.join("lib", "project.js"))) continue; // the author
      const text = readFileSync(full, "utf8");
      // `init` creates the record, so it legitimately resolves from its flag.
      if (full.endsWith(path.join("commands", "init.js"))) continue;
      // `templates` REPAIRS a missing record rather than reading one.
      if (full.endsWith(path.join("commands", "templates.js"))) continue;
      for (const m of text.matchAll(/(\w+)\?\?\s*path\.basename\(projectRoot\)|project\s*\?\?\s*path\.basename\(projectRoot\)/g)) {
        offenders.push(`${path.relative(srcDir, full)}: ${m[0]}`);
      }
      if (/PROJECT_NAME:\s*path\.basename/.test(text)) {
        offenders.push(`${path.relative(srcDir, full)}: PROJECT_NAME from the directory`);
      }
    }
  };
  walk(srcDir);
  assert.deepEqual(offenders, [],
    "read the name through lib/project.js — four private copies is how one came to disagree");
});

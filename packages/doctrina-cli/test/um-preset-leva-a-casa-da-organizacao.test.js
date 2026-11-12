// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { planPreset, presetPending, readPreset } from "../src/lib/preset.js";

// A PRESET BRINGS THE ORGANISATION'S HOUSE TO THE PROJECT (change 0253).
//
// Every repository of one company starts from the same language, the same
// rules, the same binding decisions, the same checks — and every
// `doctrina init` started from the CLI's defaults. Spec Kit answers this
// with catalogs of presets an organisation can host; the part worth having
// first is the smallest one: a folder, laid over a project, additively.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function sandbox() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-preset-"));
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const file = (/** @type {string} */ rel, /** @type {string} */ text) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), text);
  };
  file("acme/preset.json", JSON.stringify({
    name: "acme", description: "Acme house rules",
    config: { language: "pt-BR", surface: "full", rules: [{ id: "no-prod", forbid: "prod\\.acme\\.internal", paths: ["src/**"], message: "never hardcode production" }] },
  }));
  file("acme/decisions/0001-errors-are-maiusculas-snake.md",
    "# ADR 0001 — Errors are MAIUSCULAS_SNAKE\n\n- **Status:** accepted\n- **Date:** 2026-11-12\n\n## Context\n\nOne format across services.\n\n## Decision\n\nEvery error carries a MAIUSCULAS_SNAKE code.\n\n## Consequences\n\nClients switch on the code.\n");
  file("acme/skills/open-a-pr.md", "---\nname: open-a-pr\ndescription: How Acme opens a pull request.\nwhen: The task ends in a pull request.\n---\n\n# Skill — open-a-pr\n\nLink the Jira key.\n");
  file("acme/templates/skill.md.template", "---\nname: {{NAME}}\ndescription: ACME\nwhen: ACME\n---\n\n# Skill — {{NAME}}\n");
  file("acme/verify.json", JSON.stringify({ checks: [{ name: "test", run: "npm test" }] }));
  const project = (/** @type {string} */ name, /** @type {string[]} */ ...initArgs) => {
    const dir = path.join(root, name);
    mkdirSync(dir);
    const init = run(dir, ["init", "--non-interactive", "--project-name", name, ...initArgs]);
    return { dir, init };
  };
  const config = (/** @type {string} */ dir) => JSON.parse(readFileSync(path.join(dir, ".doctrina", "config.json"), "utf8"));
  return { root, run, file, project, config, preset: path.join(root, "acme"), done: () => rmSync(root, { recursive: true, force: true }) };
}

test("init --preset scaffolds a project that already carries the house", () => {
  const s = sandbox();
  try {
    const p = s.project("new", "--preset", s.preset);
    assert.equal(p.init.status, 0, p.init.out);
    assert.match(p.init.out, /preset acme — Acme house rules/);
    assert.match(p.init.out, /copied {5}\.doctrina\/decisions\/0001-errors-are-maiusculas-snake\.md/);
    assert.match(p.init.out, /the preset's verify\.json declares what `doctrina verify` RUNS on this machine: `npm test`/);
    const cfg = s.config(p.dir);
    assert.equal(cfg.language, "pt-BR");
    assert.equal(cfg.preset, "acme");
    assert.equal(cfg.rules.length, 1);
    assert.equal(cfg.surface, "full", "the preset's surface, since the flag named none");
    assert.match(readFileSync(path.join(p.dir, "AGENTS.md"), "utf8"), /\*\*Orchestrate\*\*/, "and the hub was generated from it");
    assert.doesNotMatch(p.init.out, /config surface/, "nothing to say about a value init itself wrote");
    assert.equal(s.run(p.dir, ["index", "rebuild", "--check"]).status, 0, "what the preset added is indexed");
    assert.match(s.run(p.dir, ["prime"]).out, /0001 {2}Errors are MAIUSCULAS_SNAKE/, "the organisation's decision is a standing rule here");
    assert.match(s.run(p.dir, ["skill", "list"]).out, /open-a-pr/);
    assert.equal(s.run(p.dir, ["validate"]).status, 0);
    // The preset's template is this project's: a new skill is scaffolded from it.
    s.run(p.dir, ["skill", "new", "rotate-keys"]);
    assert.match(readFileSync(path.join(p.dir, ".doctrina", "skills", "rotate-keys.md"), "utf8"), /description: ACME/);

    const flagged = s.project("flagged", "--preset", s.preset, "--surface", "core");
    assert.equal(s.config(flagged.dir).surface, "core", "the flag outranks the preset");
    assert.match(flagged.init.out, /kept {7}config surface — the project declares another value/);
  } finally {
    s.done();
  }
});

test("upgrade --preset is additive: what the project has is kept, and the plan says so", () => {
  const s = sandbox();
  try {
    const p = s.project("old");
    s.run(p.dir, ["decision", "new", "Our own first decision"]);
    writeFileSync(path.join(p.dir, ".doctrina", "config.json"), JSON.stringify({ language: "en" }));
    writeFileSync(path.join(p.dir, ".doctrina", "verify.json"), JSON.stringify({ checks: [{ name: "mine", run: "node -e 0" }] }));

    const preview = s.run(p.dir, ["upgrade", "--preset", s.preset]);
    assert.equal(preview.status, 1, "a preview with something pending exits 1, as every upgrade preview does");
    assert.match(preview.out, /kept {7}\.doctrina\/decisions\/0001-errors-are-maiusculas-snake\.md — ADR number 0001 is 0001-our-own-first-decision\.md here/);
    assert.match(preview.out, /would copy \.doctrina\/skills\/open-a-pr\.md/);
    assert.match(preview.out, /kept {7}\.doctrina\/verify\.json — the project has its own/);
    assert.doesNotMatch(preview.out, /RUNS on this machine/, "nothing executable is being copied");
    assert.match(preview.out, /kept {7}config language — the project declares another value/);
    assert.match(preview.out, /would set {2}config rules = 1 rule/);
    assert.equal(existsSync(path.join(p.dir, ".doctrina", "skills", "open-a-pr.md")), false, "a preview writes nothing");

    const written = s.run(p.dir, ["upgrade", "--preset", s.preset, "--write"]);
    assert.match(written.out, /copied {5}\.doctrina\/skills\/open-a-pr\.md/);
    const cfg = s.config(p.dir);
    assert.equal(cfg.language, "en", "the project's own choice stands");
    assert.equal(cfg.surface, "full");
    assert.equal(cfg.preset, "acme");
    assert.match(readFileSync(path.join(p.dir, ".doctrina", "verify.json"), "utf8"), /"mine"/);
    assert.equal(existsSync(path.join(p.dir, ".doctrina", "decisions", "0001-errors-are-maiusculas-snake.md")), false);
    assert.equal(s.run(p.dir, ["index", "rebuild", "--check"]).status, 0);

    const plan = planPreset(p.dir, readPreset(s.preset));
    assert.equal(presetPending(plan), 0, "applied twice, it adds nothing");
    assert.match(s.run(p.dir, ["upgrade", "--preset", s.preset]).out, /nothing to add — the project already carries the preset/);
  } finally {
    s.done();
  }
});

test("a folder that is not a preset stops the command before anything is written", () => {
  const s = sandbox();
  try {
    const dir = path.join(s.root, "fresh");
    mkdirSync(dir);
    const none = s.run(dir, ["init", "--non-interactive", "--project-name", "fresh", "--preset", path.join(s.root, "nowhere")]);
    assert.equal(none.status, 2, none.out);
    assert.match(none.out, /is not a folder/);
    assert.equal(existsSync(path.join(dir, "AGENTS.md")), false, "nothing scaffolded");

    s.file("empty/readme.md", "x");
    assert.throws(() => readPreset(path.join(s.root, "empty")), /has no preset\.json/);
    s.file("bad/preset.json", JSON.stringify({ name: "Bad Name" }));
    assert.throws(() => readPreset(path.join(s.root, "bad")), /needs a "name" of lowercase letters/);
    s.file("keys/preset.json", JSON.stringify({ name: "keys", config: { context_budjet: 1 } }));
    assert.throws(() => readPreset(path.join(s.root, "keys")), /config key "context_budjet" unknown — a preset sets language, context_budget, rules, surface/);

    const p = s.project("old");
    const bare = s.run(p.dir, ["upgrade", "--preset"]);
    assert.equal(bare.status, 2);
    assert.match(bare.out, /--preset needs the preset's folder/);
  } finally {
    s.done();
  }
});

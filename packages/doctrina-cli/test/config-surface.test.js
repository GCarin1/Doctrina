import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig, configRows, scaffoldConfig, DEFAULTS, CONFIG_REL } from "../src/lib/config.js";

// Change 0047 — one configuration surface.
//
// Five files configured a project and only one had an `--init`. Two of them
// — `config.json` (the language) and `rules.json` (project rules) — were
// created by nothing, named in no surface block and reported by no command:
// they existed only for someone who had read the source. The symptom that
// found it (audit finding F19): a pt-BR project sits permanently red under
// `clarify` and nothing anywhere says why.
//
// What these pin is the pair of properties that fixes that: a project can SEE
// what it configured, and a project that configured the old way keeps working.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-config-"));
  assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
  return dir;
}

const writeConfig = (dir, obj) =>
  writeFileSync(path.join(dir, ".doctrina", "config.json"), JSON.stringify(obj, null, 2));

test("init scaffolds the config, and it declares nothing", () => {
  const dir = project();
  try {
    const file = path.join(dir, ".doctrina", "config.json");
    assert.ok(existsSync(file), "init must create the file it expects projects to edit");
    const parsed = JSON.parse(readFileSync(file, "utf8"));

    // Documentation, not declarations. A scaffold that restated the defaults
    // would make the file lie twice over: `doctor` could not tell a choice
    // from a default, and a written default would silently outrank a legacy
    // declaration in a file the project never edited.
    assert.deepEqual(Object.keys(parsed), ["$comment"]);
    for (const option of ["language", "context_budget", "rules"]) {
      assert.match(parsed.$comment, new RegExp(option), `the scaffold must name the "${option}" option`);
    }
    assert.match(parsed.$comment, new RegExp(String(DEFAULTS.context_budget)));
    // Written from the reader's own definition, so the two cannot drift.
    assert.equal(readFileSync(file, "utf8"), scaffoldConfig());

    // A scaffolded project resolves exactly as one with no file at all.
    const withFile = loadConfig(dir);
    rmSync(file);
    assert.deepEqual(withFile, loadConfig(dir));
    assert.equal(withFile.sources.context_budget, "default");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a project on the old files behaves like one on the new", () => {
  // The migration promise: the legacy homes are still read, so nothing has
  // to move for a project to keep working.
  const legacy = project();
  const modern = project();
  try {
    // Legacy: budget in index.json's config block, rules in rules.json.
    const idxPath = path.join(legacy, ".doctrina", "index.json");
    const index = JSON.parse(readFileSync(idxPath, "utf8"));
    index.config = { context_budget: 9000 };
    writeFileSync(idxPath, JSON.stringify(index, null, 2));
    writeFileSync(path.join(legacy, ".doctrina", "rules.json"),
      JSON.stringify({ rules: [{ id: "no-acme", forbid: "AcmeCorp", message: "white label" }] }));
    writeConfig(legacy, { language: "pt-BR" });

    // Modern: all three in config.json.
    writeConfig(modern, {
      language: "pt-BR",
      context_budget: 9000,
      rules: [{ id: "no-acme", forbid: "AcmeCorp", message: "white label" }],
    });

    const a = loadConfig(legacy);
    const b = loadConfig(modern);
    assert.equal(a.language, "pt");
    assert.equal(a.context_budget, 9000);
    assert.deepEqual(a.rules, b.rules);
    assert.deepEqual([a.language, a.context_budget], [b.language, b.context_budget]);
    assert.deepEqual(a.errors, []);

    // Same values, different origins — and the origin is reported, because
    // "where did this come from?" is the question the old surface could not
    // answer.
    assert.notDeepEqual(a.sources, b.sources);
    assert.equal(b.sources.context_budget, CONFIG_REL);
    assert.match(a.sources.context_budget, /index\.json/);
    assert.match(a.sources.rules, /rules\.json/);
  } finally {
    rmSync(legacy, { recursive: true, force: true });
    rmSync(modern, { recursive: true, force: true });
  }
});

test("the declared home wins over the legacy one, per option", () => {
  const dir = project();
  try {
    const idxPath = path.join(dir, ".doctrina", "index.json");
    const index = JSON.parse(readFileSync(idxPath, "utf8"));
    index.config = { context_budget: 9000 };
    writeFileSync(idxPath, JSON.stringify(index, null, 2));
    writeConfig(dir, { context_budget: 12000 });
    assert.equal(loadConfig(dir).context_budget, 12000);
    assert.equal(loadConfig(dir).sources.context_budget, CONFIG_REL);

    // Precedence is per OPTION, not per file: dropping the key falls back to
    // the legacy home rather than to the default.
    writeConfig(dir, { language: "en" });
    assert.equal(loadConfig(dir).context_budget, 9000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the effective budget reaches context, and the language reaches clarify", () => {
  // The two consumers whose behaviour a project actually notices.
  const dir = project();
  try {
    writeConfig(dir, { context_budget: 4000 });
    const pack = runCli(["context"], dir).stdout;
    assert.match(pack, /of 4000 tokens|> 4000/, "the configured ceiling must be the one applied");

    // A PT project: the clarify lexicon follows the declared language rather
    // than a per-file stopword count. `sumir` is the Portuguese verb whose
    // English homograph ("some") is the vague quantifier the EN rules flag.
    writeConfig(dir, { language: "pt-BR" });
    writeFileSync(path.join(dir, ".doctrina", "product.md"),
      "# Acme — Product\n\n## Vision\n\nO saldo deve sumir da tela depois de alguns segundos.\n");
    const pt = runCli(["clarify", ".doctrina/product.md"], dir);
    assert.doesNotMatch(pt.stdout, /\bsome\b/i,
      "the declared language must decide the lexicon, not a per-file guess");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("doctor prints every option with its value and where it came from", () => {
  const dir = project();
  try {
    const clean = runCli(["doctor"], dir).stdout;
    assert.match(clean, /config\s+all 3 options at their defaults/);
    for (const option of ["language", "context_budget", "rules"]) {
      assert.match(clean, new RegExp(`· ${option}\\s`), `doctor must name the "${option}" option`);
    }

    writeConfig(dir, { language: "pt-BR", context_budget: 12000, rules: [] });
    const set = runCli(["doctor"], dir).stdout;
    assert.match(set, /· language\s+pt\s+\.doctrina\/config\.json/);
    assert.match(set, /· context_budget\s+12000 tokens\s+\.doctrina\/config\.json/);
    // A readout, never a failure: a default is not a fault.
    assert.doesNotMatch(set, /FAIL\s+config/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a malformed config is reported, never thrown", () => {
  // Every caller is either a gate that will report it or a command that must
  // keep working without it: a trailing comma cannot be allowed to stop a
  // context pack from being assembled.
  const dir = project();
  try {
    writeFileSync(path.join(dir, ".doctrina", "config.json"), "{ not json");
    const cfg = loadConfig(dir);
    assert.equal(cfg.context_budget, DEFAULTS.context_budget);
    assert.equal(cfg.errors.length, 1);
    assert.match(cfg.errors[0], /config\.json is not valid JSON/);
    assert.equal(runCli(["context"], dir).status, 0, "a pack must still assemble");
    assert.equal(runCli(["validate"], dir).status, 1, "but validate must say so");
    assert.match(runCli(["validate"], dir).stdout, /config\.json is not valid JSON/);

    // A wrong TYPE is reported too, and the option falls back rather than
    // taking a nonsense value.
    writeConfig(dir, { context_budget: "lots", language: "klingon" });
    const typed = loadConfig(dir);
    assert.equal(typed.context_budget, DEFAULTS.context_budget);
    assert.equal(typed.language, null);
    assert.equal(typed.errors.length, 2);
    assert.ok(configRows(dir).every((r) => typeof r.value === "string"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

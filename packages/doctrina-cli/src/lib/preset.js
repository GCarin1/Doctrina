// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, walk, write } from "./fs-ops.js";
import { configPath } from "./config.js";

// A PRESET: THE ORGANISATION'S HOUSE, IN A FOLDER (change 0253).
//
// Every project of one company starts from the same things — its language,
// the rules no repository may break, the decisions that bind all of them,
// its templates, the checks its pipeline runs — and each `doctrina init`
// started from the CLI's defaults, so the house style was re-typed, or
// forgotten, per repository. A preset is a folder (a repository the team
// clones, a submodule, a path on a shared drive — the CLI makes no network
// call) that `init --preset` and `upgrade --preset` lay over a project:
//
//   preset.json     { "name", "description", "config": { … } }
//   templates/**    → .doctrina/templates/**   (per-file overrides, ADR 0019)
//   decisions/*.md  → .doctrina/decisions/
//   skills/*.md     → .doctrina/skills/
//   verify.json     → .doctrina/verify.json    (only when the project has none)
//
// ADDITIVE, like every scaffold update: a file the project already has is
// kept, a config key it already declares is kept, and the plan says so.

export const PRESET_FILE = "preset.json";
const NAME = /^[a-z0-9][a-z0-9-]*$/;
const CONFIG_KEYS = ["language", "context_budget", "rules", "surface"];
const FOLDERS = [
  { from: "templates", to: ".doctrina/templates", only: null },
  { from: "decisions", to: ".doctrina/decisions", only: /\.md$/ },
  { from: "skills", to: ".doctrina/skills", only: /\.md$/ },
];

/**
 * Read a preset folder. Throws an Error whose message says what is wrong
 * with it — the caller prints it and exits 2.
 * @param {string} dir
 * @returns {{ dir: string, name: string, description: string, config: Record<string, any> }}
 */
export function readPreset(dir) {
  const root = path.resolve(dir);
  if (!isDir(root)) throw new Error(`preset ${dir} is not a folder`);
  const file = path.join(root, PRESET_FILE);
  if (!isFile(file)) throw new Error(`${dir} has no ${PRESET_FILE} — a preset is a folder with one: { "name": "acme", "config": { … } }`);
  let data;
  try {
    data = JSON.parse(read(file));
  } catch (err) {
    throw new Error(`${path.join(dir, PRESET_FILE)} is not valid JSON: ${/** @type {Error} */ (err).message}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(`${PRESET_FILE} must be an object`);
  if (typeof data.name !== "string" || !NAME.test(data.name)) throw new Error(`${PRESET_FILE} needs a "name" of lowercase letters, digits and hyphens`);
  const config = data.config ?? {};
  if (typeof config !== "object" || Array.isArray(config)) throw new Error(`${PRESET_FILE}: "config" must be an object`);
  const unknown = Object.keys(config).filter((k) => !CONFIG_KEYS.includes(k));
  if (unknown.length > 0) throw new Error(`${PRESET_FILE}: config key${unknown.length === 1 ? "" : "s"} ${unknown.map((k) => `"${k}"`).join(", ")} unknown — a preset sets ${CONFIG_KEYS.join(", ")}`);
  return { dir: root, name: data.name, description: typeof data.description === "string" ? data.description : "", config };
}

const posix = (/** @type {string} */ p) => p.split(path.sep).join("/");
const adrNumber = (/** @type {string} */ name) => name.match(/^(\d{4})-/)?.[1] ?? null;

/**
 * What laying the preset over the project would do. Reads only.
 * @returns {{
 *   files: { rel: string, from: string, action: "copy" | "same" | "kept", note: string }[],
 *   config: { key: string, value: any, action: "set" | "kept" | "same" }[],
 *   verify: string[],
 * }}
 */
export function planPreset(projectRoot, preset) {
  /** @type {{ rel: string, from: string, action: "copy" | "same" | "kept", note: string }[]} */
  const files = [];
  const taken = new Map();
  const decisions = path.join(projectRoot, ".doctrina", "decisions");
  if (isDir(decisions)) {
    for (const f of readdirSync(decisions)) {
      const n = adrNumber(f);
      if (n) taken.set(n, f);
    }
  }
  const add = (/** @type {string} */ from, /** @type {string} */ rel) => {
    const dest = path.join(projectRoot, rel);
    if (isFile(dest)) {
      files.push({ rel, from, action: read(dest) === read(from) ? "same" : "kept", note: "the project has its own" });
      return;
    }
    // An ADR's number is its identity: a preset decision whose number the
    // project already gave to another one is not renumbered behind its back.
    const n = rel.startsWith(".doctrina/decisions/") ? adrNumber(path.basename(rel)) : null;
    if (n && taken.has(n)) {
      files.push({ rel, from, action: "kept", note: `ADR number ${n} is ${taken.get(n)} here — copy it under a free number by hand` });
      return;
    }
    files.push({ rel, from, action: "copy", note: "" });
  };
  for (const folder of FOLDERS) {
    const base = path.join(preset.dir, folder.from);
    for (const from of walk(base)) {
      if (folder.only && !folder.only.test(from)) continue;
      add(from, `${folder.to}/${posix(path.relative(base, from))}`);
    }
  }
  /** @type {string[]} */
  let verify = [];
  const presetVerify = path.join(preset.dir, "verify.json");
  if (isFile(presetVerify)) {
    add(presetVerify, ".doctrina/verify.json");
    try {
      verify = (JSON.parse(read(presetVerify)).checks ?? []).map((/** @type {{ run?: string }} */ ch) => String(ch.run ?? "")).filter(Boolean);
    } catch { /* an unreadable verify.json is reported by `doctrina verify` once copied */ }
  }

  /** @type {Record<string, any>} */
  let current = {};
  try {
    current = JSON.parse(read(configPath(projectRoot)));
  } catch { /* no config.json yet, or an unreadable one: nothing is declared */ }
  const config = Object.entries(preset.config).map(([key, value]) => ({
    key, value,
    action: /** @type {"set" | "kept" | "same"} */ (!(key in current) ? "set"
      : JSON.stringify(current[key]) === JSON.stringify(value) ? "same" : "kept"),
  }));
  return { files, config, verify };
}

/** How many things the plan would write. */
export function presetPending(plan) {
  return plan.files.filter((f) => f.action === "copy").length + plan.config.filter((c) => c.action === "set").length;
}

/** Write what the plan calls for. The caller re-derives the index. */
export function applyPreset(projectRoot, preset, plan) {
  for (const f of plan.files) {
    if (f.action === "copy") write(path.join(projectRoot, f.rel), read(f.from));
  }
  const file = configPath(projectRoot);
  /** @type {Record<string, any>} */
  let current = {};
  try {
    current = JSON.parse(read(file));
  } catch { /* written whole below */ }
  /** @type {Record<string, any>} */
  const next = { ...current };
  for (const c of plan.config) if (c.action === "set") next[c.key] = c.value;
  next.preset = preset.name;
  write(file, JSON.stringify(next, null, 2) + "\n", { force: true });
}

/**
 * The plan as lines a person reads: what is copied, what is kept and why,
 * and — said every time — the commands a preset's verify.json would run.
 * @param {boolean} written
 * @returns {string[]}
 */
export function describePreset(preset, plan, written) {
  const verb = written ? "copied    " : "would copy";
  const lines = [`preset ${preset.name}${preset.description ? ` — ${preset.description}` : ""}`];
  for (const f of plan.files) {
    if (f.action === "copy") lines.push(`  ${verb} ${f.rel}`);
    else if (f.action === "kept") lines.push(`  kept       ${f.rel} — ${f.note}`);
  }
  for (const c of plan.config) {
    const shown = Array.isArray(c.value) ? `${c.value.length} rule${c.value.length === 1 ? "" : "s"}` : JSON.stringify(c.value);
    if (c.action === "set") lines.push(`  ${written ? "set       " : "would set "} config ${c.key} = ${shown}`);
    else if (c.action === "kept") lines.push(`  kept       config ${c.key} — the project declares another value`);
  }
  const copiesVerify = plan.files.some((f) => f.rel === ".doctrina/verify.json" && f.action === "copy");
  if (copiesVerify && plan.verify.length > 0) {
    lines.push(`  note       the preset's verify.json declares what \`doctrina verify\` RUNS on this machine: ${plan.verify.map((r) => `\`${r}\``).join(", ")} — read it before running the gate`);
  }
  const same = plan.files.filter((f) => f.action === "same").length;
  if (same > 0) lines.push(`  same       ${same} file${same === 1 ? "" : "s"} already as the preset has ${same === 1 ? "it" : "them"}`);
  if (presetPending(plan) === 0) lines.push("  nothing to add — the project already carries the preset");
  return lines;
}

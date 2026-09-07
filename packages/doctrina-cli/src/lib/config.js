// @ts-check
// The project's configuration, in one place, with WHERE each value came from.
//
// Five files configured a Doctrina project and only one of them had an
// `--init`: `index.json` (the context budget, under `config`), `config.json`
// (the language, read by `clarify` alone), `rules.json` (project rules,
// read by `validate` alone), `verify.json`, and `verify.signoffs.json`.
// `config.json` and `rules.json` were created by nothing, documented in no
// surface block, and reported by no command — they existed only for someone
// who had read the source. The symptom that found this (audit finding F19):
// a pt-BR project sits permanently red under `clarify` with no clue why.
//
// `.doctrina/config.json` is now the declared home. The old locations are
// still READ — a project that configured a budget in `index.json` keeps
// working, and removal is announced rather than performed here — but every
// consumer asks this module, and every value carries its source so `doctor`
// can print "configured" or "default" instead of leaving a project to guess.
import path from "node:path";
import { isFile, read } from "./fs-ops.js";

export const CONFIG_REL = ".doctrina/config.json";
export const RULES_REL = ".doctrina/rules.json";

// The built-in default for every option. `language: null` means "detect per
// file", which is what the absence of a declaration has always meant.
export const DEFAULTS = Object.freeze({
  language: null,
  context_budget: 15000,
  rules: [],
});

// Where a value came from, most authoritative first. The strings are printed
// by `doctor`, so they name FILES a reader can open, not internal ids.
export const SOURCES = Object.freeze({
  config: CONFIG_REL,
  index: ".doctrina/index.json (config block — legacy home)",
  rules: RULES_REL + " (legacy home)",
  default: "default",
});

export function configPath(projectRoot) {
  return path.join(projectRoot, ".doctrina", "config.json");
}

/**
 * Read the effective configuration.
 *
 * Precedence, per option: `.doctrina/config.json` → the legacy home for that
 * option → the built-in default. Malformed JSON is REPORTED, never thrown:
 * a project cannot be left unable to assemble a context pack because someone
 * left a trailing comma in a preferences file — `validate` is where that
 * becomes an error.
 *
 * @param {string} projectRoot
 * @returns {{
 *   language: string|null, context_budget: number, rules: any[],
 *   sources: {language: string, context_budget: string, rules: string},
 *   errors: string[]
 * }}
 */
export function loadConfig(projectRoot) {
  const errors = [];
  const cfg = readJson(configPath(projectRoot), CONFIG_REL, errors);
  /** @type {{language: string, context_budget: string, rules: string}} */
  const sources = { language: SOURCES.default, context_budget: SOURCES.default, rules: SOURCES.default };

  // language — config.json has always been its only home.
  //
  // PRESENCE is what makes an option configured, not the value: a key
  // scaffolded as its default is still a declaration, and reporting it as
  // "default" would tell a reader the file does not say what it plainly
  // says. Only a key that is absent, or one whose value is rejected, falls
  // back to the default.
  let language = DEFAULTS.language;
  if (cfg && "language" in cfg) {
    const rawLang = cfg.language;
    sources.language = SOURCES.config;
    if (rawLang === null) {
      language = null; // an explicit "detect per file"
    } else if (typeof rawLang === "string" && normalizeLanguage(rawLang) !== null) {
      language = normalizeLanguage(rawLang);
    } else {
      errors.push(`${CONFIG_REL}: unknown language ${JSON.stringify(rawLang)} (use "en" or "pt", or null to detect per file)`);
      sources.language = SOURCES.default;
    }
  }

  // context_budget — declared here, historically in index.json's config block.
  let context_budget = DEFAULTS.context_budget;
  if (cfg && "context_budget" in cfg && isPositiveInt(cfg.context_budget)) {
    context_budget = cfg.context_budget;
    sources.context_budget = SOURCES.config;
  } else {
    if (cfg && "context_budget" in cfg) {
      errors.push(`${CONFIG_REL}: context_budget must be a positive integer (got ${JSON.stringify(cfg.context_budget)})`);
    }
    const fromIndex = readJson(path.join(projectRoot, ".doctrina", "index.json"), ".doctrina/index.json", [])?.config?.context_budget;
    if (isPositiveInt(fromIndex)) {
      context_budget = fromIndex;
      sources.context_budget = SOURCES.index;
    }
  }

  // rules — declared here, historically a file of their own.
  let rules = DEFAULTS.rules;
  if (cfg && Array.isArray(cfg.rules)) {
    rules = cfg.rules;
    sources.rules = SOURCES.config;
  } else {
    if (cfg && "rules" in cfg) {
      errors.push(`${CONFIG_REL}: rules must be an array`);
    }
    const rulesPath = path.join(projectRoot, ".doctrina", "rules.json");
    if (isFile(rulesPath)) {
      const legacy = readJson(rulesPath, RULES_REL, errors);
      if (legacy && !Array.isArray(legacy.rules)) {
        errors.push(`${RULES_REL}: expected { "rules": [...] }`);
      } else if (legacy) {
        rules = legacy.rules;
        sources.rules = SOURCES.rules;
      }
    }
  }

  return { language, context_budget, rules, sources, errors };
}

/**
 * The configuration as rows a reader can scan: option, effective value, and
 * where it came from. `doctor` prints these; the point is that a project can
 * see what it configured without reading the CLI's source.
 *
 * @param {string} projectRoot
 * @returns {{option: string, value: string, source: string, configured: boolean}[]}
 */
export function configRows(projectRoot) {
  const cfg = loadConfig(projectRoot);
  const show = (v) => (v === null ? "auto-detect per file" : String(v));
  return [
    { option: "language", value: show(cfg.language), source: cfg.sources.language, configured: cfg.sources.language !== SOURCES.default },
    { option: "context_budget", value: `${cfg.context_budget} tokens`, source: cfg.sources.context_budget, configured: cfg.sources.context_budget !== SOURCES.default },
    { option: "rules", value: `${cfg.rules.length} rule${cfg.rules.length === 1 ? "" : "s"}`, source: cfg.sources.rules, configured: cfg.sources.rules !== SOURCES.default },
  ];
}

/** "pt-BR" → "pt", "en-GB" → "en", anything else → null. */
export function normalizeLanguage(raw) {
  const lang = String(raw ?? "").toLowerCase();
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("en")) return "en";
  return null;
}

function isPositiveInt(n) {
  return Number.isInteger(n) && n > 0;
}

// A malformed file is a finding, not an exception: every caller of this
// module is either a gate that will report it or a command that must keep
// working without it.
function readJson(file, rel, errors) {
  if (!isFile(file)) return null;
  try {
    return JSON.parse(read(file));
  } catch (err) {
    errors.push(`${rel} is not valid JSON: ${err.message}`);
    return null;
  }
}

/**
 * The file `init` writes, from the same module that reads it.
 *
 * Written from the definition rather than from a template, for the reason
 * index.json is: a template copy is how a project comes to be born already
 * needing a scaffold update (audit item C5).
 *
 * It declares NOTHING. A scaffold that restated every default would make the
 * file lie in two directions: `doctor` could no longer tell a choice from a
 * default, and a written default would silently outrank a legacy declaration
 * — a project that had set its budget in index.json would find it ignored by
 * a file it never edited. So the scaffold is documentation of the options,
 * and the first key a project adds is the first thing it has actually chosen.
 * JSON carries no comments, hence `$comment`.
 *
 * @returns {string} the file's contents, newline-terminated
 */
export function scaffoldConfig() {
  return JSON.stringify({
    $comment:
      "Doctrina project configuration. Nothing is declared here yet — add a key to " +
      "change it. Options: \"language\" (\"en\" | \"pt\", or null to detect per file); " +
      `"context_budget" (positive integer, default ${DEFAULTS.context_budget}); ` +
      "\"rules\" (array of { id, forbid, paths, message } — permanent project " +
      "constraints enforced by `doctrina validate`). Run `doctrina doctor` to see the " +
      "effective value of each option and where it came from.",
  }, null, 2) + "\n";
}

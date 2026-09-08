// @ts-check
import path from "node:path";
import { getSection } from "./doc-model.js";
import { isDir, isFile, read, relPath, walk } from "./fs-ops.js";

// The RUNTIME surface: the half of the truth that never lived in Markdown.
//
// Doctrina's index assumes truth lives in versioned prose. Operational truth
// does not. It lives in a job's `env:` block, in an absent `${{ vars.X }}`
// collapsing to the empty string so a `getenv(name, default)` default never
// applies, in an enum a contract declares and no code validates, and in a
// test selector that matches zero cases and still exits 0. None of that is
// EARS, and until now no gate could see any of it — so the agent read YAML
// and source by hand and recorded the lesson only afterwards.
//
// The constraint that keeps this honest: Doctrina learns NO CI system, test
// runner, or language. Every check below reads a DECLARATION the project
// wrote in its contract — an origin, a workflow path, a glob, a pattern —
// and verifies the implementation against it. GitHub Actions and Behave are
// examples in the docs, never code paths here. That is what keeps the
// product non-goal ("not a CI/CD system, not a test framework") and SC1
// ("no runtime dependencies beside Node.js") intact.
//
// Every check returns FINDINGS, never prints: one shape, so `contract
// check`, `validate --runtime`, `triage`, and `doctor` can all render the
// same verdict and never disagree about it.

/**
 * @typedef {object} Finding
 * @property {string} code      Stable machine code (RT01...), for remedies and tests.
 * @property {"error"|"warn"} level
 * @property {string} message   What is wrong, in the agent's terms.
 * @property {string} remedy    The exact thing to do about it.
 * @property {string} [file]    Project-relative path the finding is about.
 * @property {string} [contract] Contract the finding came from.
 */

/** Origins whose value CI can inject as an EMPTY STRING rather than unset. */
const INJECTABLE_ORIGINS = new Set(["vars", "secrets"]);

/**
 * Split an Origin cell into its origin and the OPTIONAL source name it
 * declares: `secrets` -> {origin: "secrets", source: null}, and
 * `secrets:NPM_TOKEN` -> {origin: "secrets", source: "NPM_TOKEN"}.
 *
 * Exporting a variable under a name that is not the source's is routine and
 * often unavoidable — npm reads its credential from `NODE_AUTH_TOKEN`, so a
 * repository whose secret is `NPM_TOKEN` has no choice but to rename in the
 * `env:` line. RT02 is right to flag that (rename the secret and the
 * expression resolves to the empty string, so the publish fails on a blank
 * credential with nothing pointing at the cause) and was wrong to make it
 * unanswerable: its remedy said "record the intentional rename in the Wiring
 * row" while the row had nowhere to put it. A permanent warning nobody can
 * clear teaches people to ignore warnings.
 */
export function parseOrigin(cell) {
  const raw = String(cell ?? "").trim();
  const colon = raw.indexOf(":");
  if (colon < 0) return { origin: raw.toLowerCase(), source: null };
  return {
    origin: raw.slice(0, colon).trim().toLowerCase(),
    source: raw.slice(colon + 1).trim() || null,
  };
}

// ---------------------------------------------------------------------------
// Declaration parsing
// ---------------------------------------------------------------------------

/**
 * Parse a contract's runtime declarations. Every section is OPTIONAL: a
 * contract written before this existed parses to empty lists and produces no
 * findings, which is what makes the whole feature additive.
 */
export function parseRuntimeDeclaration(text) {
  return {
    env: rows(getSection(text, "Environment"), {
      name: "variable",
      required: "required",
      values: "values",
      example: "example",
    }),
    wiring: rows(getSection(text, "Wiring"), {
      name: "variable",
      origin: "origin",
      workflow: "workflow",
      job: "job/step",
      consumer: "consumer",
    }),
    selectors: rows(getSection(text, "Selectors"), {
      name: "selector",
      source: "source",
      pattern: "pattern",
      usedBy: "used by",
    }),
    budgets: rows(getSection(text, "Budgets"), {
      name: "limit",
      direction: "direction",
      value: "value",
    }),
  };
}

// A GitHub-flavoured Markdown table, mapped onto named fields. Rows whose
// key cell is a template placeholder (`<...>`) are scaffolding, not
// declarations, and are skipped — a freshly scaffolded contract must not
// start failing its own gate.
function rows(section, fields) {
  const table = parseTable(section);
  if (!table) return [];
  const out = [];
  for (const row of table.rows) {
    const item = {};
    for (const [key, header] of Object.entries(fields)) {
      const i = table.headers.findIndex((h) => h.toLowerCase() === header);
      item[key] = i < 0 ? "" : stripCode((row[i] ?? "").trim());
    }
    if (!item.name || /^[<(]/.test(item.name) || item.name === "—") continue;
    out.push(item);
  }
  return out;
}

export function parseTable(text) {
  const lines = String(text ?? "").split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
  if (lines.length < 2) return null;
  const headers = tableCells(lines[0]);
  const body = [];
  for (let i = 1; i < lines.length; i++) {
    const row = tableCells(lines[i]);
    if (row.every((cl) => /^:?-+:?$/.test(cl) || cl === "")) continue;
    body.push(row);
  }
  return { headers, rows: body };
}

// Split one table row on UNESCAPED pipes, unescaping `\|` into a literal.
// GFM's own escape, and the notation a declared enum needs most: an
// alternation like `none|critical|serious` is written `none\|critical\|serious`
// in a cell, and splitting naively on every pipe shreds it into three columns.
export function tableCells(line) {
  const body = line.trim().replace(/^\|/, "");
  const out = [];
  let cur = "";
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "\\" && body[i + 1] === "|") {
      cur += "|";
      i += 1;
      continue;
    }
    if (body[i] === "|") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += body[i];
  }
  out.push(cur.trim());
  // A row written with a closing pipe leaves one empty cell behind it.
  if (out.length > 1 && out[out.length - 1] === "" && /(?:^|[^\\])\|\s*$/.test(line)) out.pop();
  return out;
}

function stripCode(s) {
  return String(s).replace(/^`|`$/g, "").trim();
}

// A declared enum: `none|critical|serious`, or `-`/empty for "not an enum".
function parseValues(cell) {
  const raw = stripCode(String(cell ?? "")).trim();
  if (!raw || raw === "—" || raw === "-") return [];
  if (!raw.includes("|")) return [];
  return raw.split("|").map((v) => stripCode(v)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// The workflow reader — a deliberately small, indentation-aware scan
// ---------------------------------------------------------------------------

/**
 * Every `env:` mapping in a workflow file, with the job and step it belongs
 * to and the expression each key is bound to.
 *
 * This is NOT a YAML parser and does not want to be: adding one would mean a
 * runtime dependency (SC1) and knowledge of a specific CI schema. It reads
 * the two shapes every CI format shares — an `env:` block, and keys indented
 * under it — and attributes each to the nearest enclosing named block. What
 * it cannot read it reports as unreadable rather than as "absent", so an
 * unusual file never turns into a false accusation.
 *
 * @returns {{ entries: Array<{key:string, expr:string, job:string|null, step:string|null, line:number}>, readable: boolean }}
 */
export function readWorkflowEnv(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const entries = [];
  let job = null;
  let jobIndent = -1;
  let step = null;
  let inEnv = false;
  let envIndent = -1;
  let sawJobs = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indent = line.match(/^\s*/)[0].length;

    if (/^jobs:\s*$/.test(line)) {
      sawJobs = true;
      jobIndent = -1;
      inEnv = false;
      continue;
    }

    // A job header: the first mapping key nested under `jobs:`.
    if (sawJobs && /^\s+[A-Za-z0-9_.-]+:\s*$/.test(line) && (jobIndent === -1 || indent === jobIndent)) {
      if (jobIndent === -1) jobIndent = indent;
      if (indent === jobIndent) {
        job = line.trim().replace(/:$/, "");
        step = null;
        inEnv = false;
        continue;
      }
    }

    // A step: `- name: X` or `- uses: X` inside a job's `steps:`.
    const stepMatch = line.match(/^\s*-\s+(?:name|uses):\s*(.+?)\s*$/);
    if (stepMatch) {
      step = stripQuotes(stepMatch[1]);
      inEnv = false;
      continue;
    }

    if (/^\s*env:\s*$/.test(line)) {
      inEnv = true;
      envIndent = indent;
      continue;
    }

    if (inEnv) {
      if (indent <= envIndent) {
        inEnv = false;
      } else {
        const kv = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
        if (kv) {
          entries.push({ key: kv[1], expr: stripQuotes(kv[2].trim()), job, step, line: i + 1 });
          continue;
        }
      }
    }
  }

  // A workflow with no `jobs:` and no `env:` at all is more likely an
  // unreadable/foreign shape than a genuinely empty one. Saying so is the
  // difference between a finding and a false accusation.
  return { entries, readable: sawJobs || entries.length > 0 };
}

function stripQuotes(s) {
  return String(s).replace(/^["']|["']$/g, "").trim();
}

// The variable an expression pulls from, e.g. `${{ vars.FOO }}` -> vars/FOO.
export function referencedVar(expr) {
  const m = String(expr ?? "").match(/\$\{\{\s*(vars|secrets|env|inputs)\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/);
  return m ? { origin: m[1], name: m[2] } : null;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Check A / RT01-RT02 — the declared flag must actually be wired
// ---------------------------------------------------------------------------

export function checkWiring(projectRoot, decl) {
  /** @type {Finding[]} */
  const findings = [];
  const cache = new Map();

  for (const row of decl.wiring) {
    const { origin, source } = parseOrigin(row.origin);
    // The name the workflow is expected to read FROM: the declared source
    // when the row gives one, otherwise the variable's own name.
    const expectedSource = source ?? row.name;
    if (!INJECTABLE_ORIGINS.has(origin)) continue;
    if (!row.workflow) {
      findings.push({
        code: "RT01",
        level: "warn",
        message: `${row.name} declares origin "${origin}" but names no workflow — nothing binds the declaration to a job`,
        remedy: `fill the Workflow column for ${row.name} in the contract's Wiring table`,
      });
      continue;
    }

    const full = path.join(projectRoot, row.workflow);
    if (!isFile(full)) {
      findings.push({
        code: "RT01",
        level: "error",
        message: `${row.name} is wired to ${row.workflow}, which does not exist`,
        remedy: `correct the Workflow column for ${row.name}, or add ${row.workflow}`,
        file: row.workflow,
      });
      continue;
    }

    if (!cache.has(full)) cache.set(full, readWorkflowEnv(read(full)));
    const wf = cache.get(full);
    if (!wf.readable) {
      findings.push({
        code: "RT01",
        level: "warn",
        message: `${row.workflow} has no readable jobs or env: blocks — ${row.name} could not be checked`,
        remedy: `confirm ${row.workflow} is the right file; Doctrina reads env: blocks textually, not as YAML`,
        file: row.workflow,
      });
      continue;
    }

    // The declaration is satisfied when the variable is exported under the
    // name the consumer reads. This is the whole "I set the secret in GitHub
    // and nothing happened" class: the secret exists, and no `env:` line
    // ever puts it in the process.
    const exported = wf.entries.filter((e) => e.key === row.name);
    if (exported.length === 0) {
      const where = row.job ? ` (expected in ${row.job})` : "";
      findings.push({
        code: "RT01",
        level: "error",
        message: `${row.name} is declared with origin "${origin}" but no env: block in ${row.workflow} exports it${where} — the value exists in CI and never reaches the process`,
        // Quote the DECLARED source, so the line this tells you to paste is
        // the one that actually works when the names differ.
        remedy: `add "${row.name}: \${{ ${origin}.${expectedSource} }}" to the env: block of the ${row.job || "relevant"} job in ${row.workflow}`,
        file: row.workflow,
      });
      continue;
    }

    for (const e of exported) {
      const ref = referencedVar(e.expr);
      if (!ref) continue; // a literal value is a legitimate wiring
      if (ref.origin !== origin && (ref.origin === "vars" || ref.origin === "secrets")) {
        findings.push({
          code: "RT02",
          level: "error",
          message: `${row.name} is declared as "${origin}" but ${row.workflow}:${e.line} reads it from ${ref.origin} — one of the two is wrong, and CI will read the empty one`,
          remedy: `align the Origin column with ${row.workflow}:${e.line} (a value set as ${origin} is not visible as ${ref.origin})`,
          file: row.workflow,
        });
      } else if (ref.name !== expectedSource && ref.origin === origin) {
        // Silent when the workflow reads exactly the source the row
        // declares: the rename is documented, and documentation is the
        // answer this warning was asking for.
        findings.push({
          code: "RT02",
          level: "warn",
          message: source
            ? `${row.workflow}:${e.line} exports ${row.name} from ${ref.origin}.${ref.name}, but the contract declares it comes from ${origin}.${source} — one of the two moved`
            : `${row.workflow}:${e.line} exports ${row.name} from ${ref.origin}.${ref.name} — the names differ, so renaming one silently empties the other`,
          remedy: source
            ? `align them: either export \${{ ${origin}.${source} }}, or update the Origin cell to "${origin}:${ref.name}"`
            : `use \${{ ${origin}.${row.name} }}, or declare the rename in the Origin cell as "${origin}:${ref.name}"`,
          file: row.workflow,
        });
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Check B / RT03 — empty is not unset
// ---------------------------------------------------------------------------

// The footgun patterns, per language family. Each one supplies a DEFAULT that
// only applies when the variable is ABSENT — and a CI expression that resolves
// to nothing injects the empty STRING, which is present. The default never
// fires, and the flag reads as "" instead of its documented fallback.
//
// A textual lint, and its finding says so: no program analysis, no language
// runtime, no parse. It matches the shapes that are wrong on their face and
// stays silent on everything else.
const EMPTY_UNSAFE = [
  {
    build: (n) => new RegExp(`getenv\\(\\s*["']${n}["']\\s*,`),
    hint: (n) => `getenv("${n}", default) returns "" when CI injects an empty value`,
  },
  {
    build: (n) => new RegExp(`environ\\.get\\(\\s*["']${n}["']\\s*,`),
    hint: (n) => `environ.get("${n}", default) returns "" when CI injects an empty value`,
  },
  {
    build: (n) => new RegExp(`process\\.env\\.${n}\\s*\\?\\?`),
    hint: (n) => `process.env.${n} ?? default keeps "" (only null/undefined fall through)`,
  },
  {
    build: (n) => new RegExp(`process\\.env\\[\\s*["']${n}["']\\s*\\]\\s*\\?\\?`),
    hint: (n) => `process.env["${n}"] ?? default keeps "" (only null/undefined fall through)`,
  },
];

export function checkEmptySemantics(projectRoot, decl) {
  /** @type {Finding[]} */
  const findings = [];
  const cache = new Map();

  for (const row of decl.wiring) {
    // Through parseOrigin, so a row declaring its source (`secrets:NPM_TOKEN`)
    // is still recognised as CI-injectable. Reading the cell raw here would
    // make declaring a source silently switch this check off — the same
    // class of defect being fixed, wearing a different hat.
    const { origin } = parseOrigin(row.origin);
    if (!INJECTABLE_ORIGINS.has(origin) || !row.consumer) continue;
    const full = path.join(projectRoot, row.consumer);
    if (!isFile(full)) {
      findings.push({
        code: "RT03",
        level: "warn",
        message: `${row.name} names consumer ${row.consumer}, which does not exist`,
        remedy: `correct the Consumer column for ${row.name} in the Wiring table`,
        file: row.consumer,
      });
      continue;
    }
    if (!cache.has(full)) cache.set(full, read(full));
    const src = cache.get(full);
    const name = escapeRe(row.name);
    for (const pattern of EMPTY_UNSAFE) {
      if (!pattern.build(name).test(src)) continue;
      findings.push({
        code: "RT03",
        level: "error",
        message: `${row.consumer} gives ${row.name} a default that an empty value never triggers — ${pattern.hint(row.name)}. CI injects "" for an unset ${origin}, so the documented default silently does not apply`,
        remedy: `read the raw value, then treat empty as unset: take the default when the value is missing OR blank (textual lint — confirm the call site)`,
        file: row.consumer,
      });
      break;
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Check RT04 — a declared enum nobody validates
// ---------------------------------------------------------------------------

export function checkEnums(projectRoot, decl) {
  /** @type {Finding[]} */
  const findings = [];
  const envExamplePath = path.join(projectRoot, ".env.example");
  const envExample = isFile(envExamplePath) ? read(envExamplePath) : null;
  const consumerFor = new Map(decl.wiring.map((w) => [w.name, w.consumer]));

  for (const row of decl.env) {
    const values = parseValues(row.values);
    if (values.length === 0) continue;

    // The example must be a member — `AXE_SEVERITY=true` against an enum of
    // none|critical|serious is the invalid value that aborts config
    // validation on boot, discovered in CI rather than on the laptop.
    if (envExample !== null) {
      const m = envExample.match(new RegExp(`^\\s*(?:export\\s+)?${escapeRe(row.name)}\\s*=\\s*(.*)$`, "m"));
      const example = m ? stripQuotes(m[1].trim()) : null;
      if (example && !values.includes(example)) {
        findings.push({
          code: "RT04",
          level: "error",
          message: `.env.example sets ${row.name} to a value outside ${values.join("|")}`,
          remedy: `set ${row.name} to one of ${values.join("|")} in .env.example, or widen the contract's Values cell`,
          file: ".env.example",
        });
      }
    }

    // An enum the consumer never mentions is an enum nothing enforces: the
    // contract says none|critical|serious and the code takes any string.
    const consumer = consumerFor.get(row.name);
    if (!consumer) continue;
    const full = path.join(projectRoot, consumer);
    if (!isFile(full)) continue;
    const src = read(full);
    if (!values.some((v) => src.includes(v))) {
      findings.push({
        code: "RT04",
        level: "warn",
        message: `${consumer} never mentions any of ${row.name}'s declared values (${values.join("|")}) — the contract declares an enum the consumer does not appear to validate`,
        remedy: `validate ${row.name} against ${values.join("|")} in ${consumer}, or drop the Values cell if it is not really an enum`,
        file: consumer,
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Check D / RT05 — the selector that matches nothing
// ---------------------------------------------------------------------------

/**
 * A test selector (a BDD tag, a suite name, a filter expression) that matches
 * zero targets and still exits 0 is a green job that ran nothing. The
 * contract declares WHERE selectors live (a glob) and HOW to read them (a
 * regex whose first group is the name); this verifies that every selector
 * the project dispatches on actually matches something.
 */
export function checkSelectors(projectRoot, decl) {
  /** @type {Finding[]} */
  const findings = [];
  for (const row of decl.selectors) {
    const used = row.usedBy
      ? row.usedBy.split(/[,\s]+/).map(stripCode).filter(Boolean)
      : [row.name];
    if (!row.source || !row.pattern) {
      findings.push({
        code: "RT05",
        level: "warn",
        message: `selector "${row.name}" declares no Source glob or no Pattern — nothing can be extracted to compare against`,
        remedy: `fill Source (e.g. features/**/*.feature) and Pattern (a regex whose group 1 is the selector) for "${row.name}"`,
      });
      continue;
    }

    let re;
    try {
      re = new RegExp(row.pattern, "g");
    } catch {
      findings.push({
        code: "RT05",
        level: "error",
        message: `selector "${row.name}" declares an invalid Pattern regex: ${row.pattern}`,
        remedy: `fix the Pattern cell for "${row.name}" so it compiles as a regular expression`,
      });
      continue;
    }

    const files = filesMatching(projectRoot, row.source);
    if (files.length === 0) {
      findings.push({
        code: "RT05",
        level: "error",
        message: `selector "${row.name}" declares source "${row.source}", which matches no files — every dispatch on it would run zero cases and still exit 0`,
        remedy: `correct the Source glob for "${row.name}"`,
      });
      continue;
    }

    const found = new Set();
    for (const f of files) {
      for (const m of read(f).matchAll(re)) {
        if (m[1]) found.add(m[1]);
      }
    }

    for (const sel of used) {
      if (found.has(sel)) continue;
      // A separator typo (`smoke-test` vs `smoke_test`) is the common shape
      // of this bug, and naming the near-miss turns a hunt into a one-line fix.
      const near = [...found].filter((f) => f.replace(/[-_]/g, "") === sel.replace(/[-_]/g, ""));
      findings.push({
        code: "RT05",
        level: "error",
        message: `selector "${sel}" matches nothing under ${row.source} — a run dispatched on it executes 0 cases and exits 0` +
          (near.length > 0 ? ` (found "${near[0]}" — the separator differs)` : ""),
        remedy: near.length > 0
          ? `use "${near[0]}", or rename the target to "${sel}"`
          : `add the selector to a file under ${row.source}, or correct the Used by cell`,
      });
    }
  }
  return findings;
}

/**
 * Expand one level of brace alternation: `a/{x,y}.js` -> [`a/x.js`, `a/y.js`],
 * recursively, so several groups in one pattern all expand.
 *
 * Added for the `**Source:**` declarations (change 0077), where a capability
 * that owns eleven sibling modules would otherwise need eleven globs on one
 * header line. Braces have no meaning in a path, so this takes nothing away
 * from the patterns that were already valid.
 */
export function expandBraces(glob) {
  const text = String(glob);
  const open = text.indexOf("{");
  if (open < 0) return [text];
  const close = text.indexOf("}", open);
  if (close < 0) return [text];
  const head = text.slice(0, open);
  const tail = text.slice(close + 1);
  const out = [];
  for (const alt of text.slice(open + 1, close).split(",")) {
    out.push(...expandBraces(head + alt.trim() + tail));
  }
  return out;
}

// A minimal glob: `**` spans directories, `*` stays inside one segment, and
// `{a,b}` alternates. Enough for the "where do my selectors live" and "which
// code is mine" declarations, with no dependency and no surprises.
export function globToRegExp(glob) {
  const alternatives = expandBraces(glob);
  if (alternatives.length > 1) {
    return new RegExp(alternatives.map((g) => globToRegExp(g).source).join("|"));
  }
  const segments = String(glob).split("/");
  const parts = [];
  for (let i = 0; i < segments.length; i++) {
    const last = i === segments.length - 1;
    const seg = segments[i];
    if (seg === "**") {
      // `**/` spans zero or more directories (and supplies its own
      // separator); a trailing `**` takes everything below.
      parts.push(last ? ".*" : "(?:[^/]+/)*");
      continue;
    }
    // Character by character: only `*` and `?` are wildcards, and every
    // other character is a literal. Escaping per character keeps this
    // readable and immune to the ordering bugs a chain of replaces invites.
    const body = [...seg]
      .map((ch) => (ch === "*" ? "[^/]*" : ch === "?" ? "[^/]" : escapeRe(ch)))
      .join("");
    parts.push(last ? body : `${body}/`);
  }
  return new RegExp(`^${parts.join("")}$`);
}

/**
 * Every file under `projectRoot` matching one glob, project-relative.
 *
 * Exported since change 0077: `validate` asks the same question of a spec's
 * `**Source:**` patterns that the selector check asks of a contract's — does
 * this declaration point at anything that exists?
 */
export function filesMatching(projectRoot, glob) {
  const re = globToRegExp(glob);
  // Walk from the deepest literal directory prefix so a narrow glob never
  // costs a full-tree walk.
  const prefix = String(glob).split("/").filter((s) => !/[*?]/.test(s));
  let base = projectRoot;
  for (const seg of prefix) {
    const next = path.join(base, seg);
    if (isDir(next)) base = next;
    else break;
  }
  if (!isDir(base)) return [];
  return walk(base).filter((f) => re.test(relPath(projectRoot, f).replaceAll("\\", "/")));
}

// ---------------------------------------------------------------------------
// Budgets (G) — a ceiling is a contract, not a preference
// ---------------------------------------------------------------------------

/** Declared ceilings, keyed by limit name: { direction, value }. */
export function parseBudgets(decl) {
  const out = new Map();
  for (const row of decl.budgets) {
    const value = Number.parseInt(String(row.value).replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(value)) continue;
    out.set(row.name, { direction: String(row.direction).toLowerCase(), value });
  }
  return out;
}

/**
 * The value this project declares for ONE budget, or `fallback` when it
 * declares none.
 *
 * Every budget in this codebase has had two homes — a literal beside the
 * check and a row in the contract's Budgets table — and every one of them
 * drifted (change 0059, then 0072). The contract is the declaration, so it
 * wins; the literal a caller passes is the shipped default for a project
 * that declares nothing. A malformed contract is its own finding, never a
 * reason for the caller to lose its check.
 *
 * @param {string} projectRoot
 * @param {string} name
 * @param {number} fallback
 * @returns {{ value: number, declared: boolean }}
 */
export function declaredBudget(projectRoot, name, fallback) {
  try {
    const row = collectBudgets(projectRoot).get(name);
    if (row && Number.isFinite(row.value) && row.value > 0) {
      return { value: row.value, declared: true };
    }
  } catch {
    // fall through to the shipped default
  }
  return { value: fallback, declared: false };
}

/** Every declared budget across every contract, keyed by limit name. */
export function collectBudgets(projectRoot) {
  const out = new Map();
  for (const file of contractPaths(projectRoot)) {
    for (const [name, budget] of parseBudgets(parseRuntimeDeclaration(read(file)))) {
      out.set(name, { ...budget, contract: relPath(projectRoot, file).replaceAll("\\", "/") });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The whole runtime verdict, for every contract in the project
// ---------------------------------------------------------------------------

export function contractPaths(projectRoot) {
  const dir = path.join(projectRoot, ".doctrina", "contracts");
  if (!isDir(dir)) return [];
  return walk(dir).filter((f) => f.endsWith(".md")).sort();
}

/**
 * Run every runtime check over every contract.
 * @returns {{ findings: Finding[], contracts: number, declared: number }}
 */
export function collectRuntimeFindings(projectRoot) {
  /** @type {Finding[]} */
  const findings = [];
  let declared = 0;
  const files = contractPaths(projectRoot);
  for (const file of files) {
    const decl = parseRuntimeDeclaration(read(file));
    declared += decl.wiring.length + decl.selectors.length;
    const where = relPath(projectRoot, file).replaceAll("\\", "/");
    for (const f of [
      ...checkWiring(projectRoot, decl),
      ...checkEmptySemantics(projectRoot, decl),
      ...checkEnums(projectRoot, decl),
      ...checkSelectors(projectRoot, decl),
    ]) {
      findings.push({ ...f, contract: where });
    }
  }
  return { findings, contracts: files.length, declared };
}

/**
 * Local `.env` against the declared enums — NAMES and membership only. The
 * value is never read into a message, never printed, and never logged: the
 * point is to catch the invalid value before it aborts config validation in
 * CI, not to leak a secret into a terminal or a CI log.
 */
export function checkLocalEnv(projectRoot) {
  /** @type {Finding[]} */
  const findings = [];
  const envPath = path.join(projectRoot, ".env");
  if (!isFile(envPath)) return findings;
  const env = new Map();
  for (const line of read(envPath).split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) env.set(m[1], stripQuotes(m[2].trim()));
  }
  for (const file of contractPaths(projectRoot)) {
    const decl = parseRuntimeDeclaration(read(file));
    for (const row of decl.env) {
      const values = parseValues(row.values);
      const required = /^(yes|true|required)$/i.test(String(row.required).trim());
      if (required && !env.has(row.name)) {
        findings.push({
          code: "RT06",
          level: "error",
          message: `.env does not set ${row.name}, which the contract marks required`,
          remedy: `add ${row.name} to your local .env (see .env.example)`,
          file: ".env",
        });
        continue;
      }
      if (values.length === 0 || !env.has(row.name)) continue;
      if (!values.includes(env.get(row.name))) {
        findings.push({
          code: "RT06",
          level: "error",
          // The offending value is deliberately absent from this message.
          message: `.env sets ${row.name} to a value outside ${values.join("|")} — config validation will reject it on boot (value withheld)`,
          remedy: `set ${row.name} to one of ${values.join("|")}`,
          file: ".env",
        });
      }
    }
  }
  return findings;
}

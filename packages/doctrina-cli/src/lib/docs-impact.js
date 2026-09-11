// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, walk } from "./fs-ops.js";
import { COMMAND_NAMES } from "./commands.js";
import { locateTemplatesDir } from "./templates.js";
import { changedFiles, isRepo } from "./git.js";
import { maskComments, getSection } from "./doc-model.js";
import { listHeader } from "./scan.js";

// "Docs ship inside the change, never after it" (audit item D2).
//
// A docs phase scheduled AFTER the work never happens. So a change that
// alters a documented surface — a command, a flag, an exit code — must also
// carry the documentation for it, checked at close time and refusable with
// --force exactly like the archive verification gate.
//
// Both halves are deterministic: what the change says it touches is read
// from its own artifacts, and whether docs moved is read from git. No
// language understanding (ADR 0005).

const DOC_PATHS = [/^docs\//, /^README\.md$/, /^README\.pt\.md$/];

// Non-empty lines of the shipped change templates, so authored content can
// be told apart from scaffold. Computed once; falls back to an empty set
// when the templates cannot be located (unusual installs), which only makes
// the gate more eager, never wrong about a real signal.
// Ticking a scaffold checkbox rewrites "- [ ] ..." to "- [x] ...", which
// would otherwise stop the line matching its own template and make every
// completed change look authored. Compare with the box state normalised.
function normaliseScaffoldLine(line) {
  return line.trim().replace(/^-\s*\[[ xX]\]/, "- [ ]");
}

let scaffoldCache = null;
function scaffoldLines() {
  if (scaffoldCache) return scaffoldCache;
  const lines = new Set();
  try {
    const changeTemplates = path.join(locateTemplatesDir(), "change");
    for (const f of walk(changeTemplates)) {
      for (const line of read(f).split(/\r?\n/)) {
        const trimmed = normaliseScaffoldLine(line);
        if (trimmed) lines.add(trimmed);
      }
    }
  } catch { /* no templates dir — treat everything as authored */ }
  scaffoldCache = lines;
  return lines;
}

function escapeRe(x) {
  return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The names THIS project declares as its integration surface, read from its
// own contracts: the variables of the Environment and Wiring tables, the
// services of the Ports table, and the backticked tokens of Interfaces.
//
// A contract is the right home for this. It is where a project already states
// what an external consumer integrates against, it is versioned beside the
// code, and `contract check` already holds parts of it to the implementation
// (ADR 0023 — the runtime surface is declared, never inferred). The same
// principle, applied to documentation: declared, never guessed.
//
// Returns [] for a project with no contracts, which is what keeps the change
// backward compatible: that project's gate behaves exactly as it did.
export function declaredSurfaceNames(projectRoot) {
  const dir = path.join(projectRoot, ".doctrina", "contracts");
  if (!isDir(dir)) return [];
  const names = new Set();
  for (const file of walk(dir)) {
    if (!file.endsWith(".md")) continue;
    const text = maskComments(read(file));

    // First column of a table, for the sections whose first column IS the name.
    for (const section of ["Ports", "Environment", "Wiring", "Selectors", "Budgets"]) {
      const body = getSection(text, section);
      if (!body) continue;
      for (const line of body.split(/\r?\n/)) {
        const m = /^\s*\|\s*([A-Za-z][\w.-]*)\s*\|/.exec(line);
        if (!m) continue;
        const cell = m[1];
        // Skip the header row and the template's own placeholder rows.
        if (/^(service|variable|selector|limit|name)$/i.test(cell)) continue;
        if (/^-+$/.test(cell)) continue;
        names.add(cell);
      }
    }

    // Interfaces is prose with backticked tokens: endpoints, flags, shapes.
    const interfaces = getSection(text, "Interfaces");
    if (interfaces) {
      for (const m of interfaces.matchAll(/`([^`\n]{2,60})`/g)) {
        const token = m[1].trim();
        // A command with a subcommand ("ledgerly reconcile") is exactly the
        // shape worth declaring, so single internal spaces are allowed —
        // anything with punctuation or prose in it is not a name.
        if (/^[\w./:@+-]+(?: [\w./:@+-]+)*$/.test(token)) names.add(token);
      }
    }
  }
  return [...names];
}

// Does this change alter something the documentation makes promises about?
// Read from the change's own artifacts — the deltas it will merge into
// specs, plus the proposal that states its shape. Returns the list of
// signals found (empty when the change touches no documented surface).
// Drop the proposal's `## Verification` section before reading it for
// surface signals. That section answers "how will you know this landed", so
// the commands it names are the ones the author will RUN — the same reason
// the template's own checklist lines are subtracted below. Running a gate is
// not changing it (change 0088).
function withoutVerification(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let skipping = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) skipping = /^##\s+Verification\b/i.test(line);
    if (!skipping) out.push(line);
  }
  return out.join("\n");
}

export function documentedSurfaceSignals(changeDir, projectRoot = null) {
  const signals = [];
  const known = new Set(COMMAND_NAMES);

  // Read only what the AUTHOR wrote. The scaffold's own boilerplate names
  // commands — the proposal's Verification checklist cites `doctrina verify`
  // and `doctrina coverage` — so scanning the raw file made every change look
  // like it touched a documented surface. A gate that fires on everything is
  // a gate that gets ignored, so the template's lines are subtracted first.
  // An HTML comment is annotation, not authored surface. The guessed delta
  // change 0044 scaffolds carries a `RANKED GUESS` note that names
  // `doctrina work` — not template text, so the subtraction below never
  // reaches it, and every change on the default path arrived at the docs
  // gate carrying a phantom `commands: work`. Comments are blanked FIRST,
  // by the document model, which is the one owner of that rule.
  const boilerplate = scaffoldLines();
  const authored = (text) => maskComments(text)
    .split(/\r?\n/)
    .filter((line) => !boilerplate.has(normaliseScaffoldLine(line)))
    .join("\n");

  const sources = [];
  const proposal = path.join(changeDir, "proposal.md");
  if (isFile(proposal)) {
    const text = read(proposal);

    // A CHORE declares that no behaviour changes and no spec moves — that is
    // what the lane means, and `analyze` already reads it that way ("0 spec
    // deltas, metadata-only change"). Asking such a change to document a
    // surface it declared it does not touch contradicts its own lane. The
    // declaration is the author's, recorded in the proposal header and the
    // index (change 0042), so it is auditable rather than invisible.
    //
    // This is the case that mattered: of the archived changes, every chore
    // names a command in code context and none of them changes one. Change
    // 0085 reorganised headings in AGENTS.md and was refused for "commands:
    // close, templates" — the two commands its own proposal cited to describe
    // the finding — and had to close with --force (change 0088).
    if (/chore/i.test(listHeader(text, "Lane") ?? "")) return signals;

    sources.push(authored(withoutVerification(text)));
  }
  for (const p of walk(path.join(changeDir, "specs"))) {
    if (p.endsWith("delta.md")) sources.push(authored(read(p)));
  }
  const text = sources.join("\n");
  if (!text.trim()) return signals;

  // Command references, from code context only, so prose about "the
  // doctrina framework" is not a signal.
  const chunks = [];
  const outside = text.replace(/```[\s\S]*?```/g, (b) => { chunks.push(b); return "\n"; });
  for (const m of outside.matchAll(/`[^`]+`/g)) chunks.push(m[0]);
  const code = chunks.join("\n");

  const commands = new Set();
  for (const m of code.matchAll(/(?:npx\s+doctrina-cli|doctrina)\s+([a-z][a-z-]+)/g)) {
    if (known.has(m[1])) commands.add(m[1]);
  }
  if (commands.size > 0) {
    signals.push(`commands: ${[...commands].sort().join(", ")}`);
  }

  // The surface the PROJECT declares, matched by name (change 0075's sibling
  // problem, found in the second audit). Matching commands against Doctrina's
  // own catalog made the gate maximally sensitive inside this repository and
  // inert everywhere else: in an adopting project a new command, a public HTTP
  // endpoint, a renamed environment variable and a changed config key all
  // produced ZERO signals, and the change closed with no documentation and no
  // complaint. The vocabulary was already in the right place — the contract
  // declares Ports, Environment, Wiring, Selectors and Interfaces — so the gate
  // reads it instead of carrying a catalog that only fits its author.
  const declared = projectRoot === null ? [] : declaredSurfaceNames(projectRoot);
  const hit = declared.filter((name) => new RegExp(`\\b${escapeRe(name)}\\b`).test(code));
  // Report the most specific declaration only: "ledgerly reconcile" says more
  // than the bare service name it starts with.
  const touchedDeclared = hit.filter((a) => !hit.some((b) => b !== a && b.includes(a)));
  if (touchedDeclared.length > 0) {
    signals.push(`declared surface: ${touchedDeclared.sort().slice(0, 8).join(", ")}`);
  }

  const flags = new Set();
  for (const m of code.matchAll(/--([a-z][a-z0-9-]{2,})/g)) flags.add(`--${m[1]}`);
  if (flags.size > 0) {
    signals.push(`flags: ${[...flags].sort().slice(0, 8).join(", ")}`);
  }

  // Surface SHAPES, for the surface a change is ADDING — which by definition
  // is not in the contract yet, and is the case the declared-name match cannot
  // reach. Deterministic and language-agnostic (ADR 0005): a route path, an
  // HTTP method in front of one, an environment-variable identifier. Read from
  // code spans only, so prose that happens to contain a slash is not a signal.
  const routes = new Set();
  for (const m of code.matchAll(/(?:^|[\s`"'(])((?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+)?(\/[a-z][\w.-]*(?:\/[\w.:{}$<>-]+)+)/gi)) {
    routes.add(((m[1] ?? "").toUpperCase().trim() + " " + m[2]).trim());
  }
  if (routes.size > 0) {
    signals.push(`endpoints: ${[...routes].sort().slice(0, 6).join(", ")}`);
  }

  const envVars = new Set();
  for (const m of code.matchAll(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) {
    // Not twice: a declared variable is already reported by name above.
    if (!touchedDeclared.includes(m[1])) envVars.add(m[1]);
  }
  if (envVars.size > 0) {
    signals.push(`environment: ${[...envVars].sort().slice(0, 8).join(", ")}`);
  }

  if (/\bexit\s+code|\bexits?\s+(?:with\s+)?[0-4]\b/i.test(text)) {
    signals.push("exit codes");
  }

  return signals;
}

// Documentation paths touched by the work in flight. Union of the working
// tree (uncommitted, the common agent case) and this branch's commits
// against the default branch (the case where the agent already committed).
// Returns [] outside a git repository — where the gate cannot see, it does
// not accuse.
//
// KNOWN COARSENESS: this answers "did documentation move in this work?",
// not "did documentation move FOR THIS CHANGE?". Closing several changes
// from one uncommitted working tree, docs written for an earlier change
// satisfy the gate for a later one. The gate is deliberately permissive
// here — its job is to stop a change shipping with NO documentation at
// all, and attributing a hunk to a change would need guesswork the rest of
// the framework refuses to do (ADR 0005).
export function docsTouched(projectRoot) {
  // mergeBase: a branch's EARLIER commits count as documentation that moved
  // with the change — the gate asks "did docs ship with this work", not "did
  // docs change since the last commit".
  return changedFiles(projectRoot, { mergeBase: true })
    .files
    .filter((f) => DOC_PATHS.some((re) => re.test(f)));
}

export function isGitRepo(projectRoot) {
  return isRepo(projectRoot);
}

// A CHANGELOG IS A DIFFERENT OBLIGATION FROM DOCUMENTATION.
//
// The docs gate asks "can a reader learn how this works". The changelog asks
// "can a reader learn that it changed" — and the second is not answered by
// the first, because prose describing the new behaviour reads exactly like
// prose that always described it.
//
// Nothing asked for it, so it drifted immediately: thirteen changes landed in
// one session, every one of them through `close`, and `## [Unreleased]` was
// still empty at the end of it. The file's own first line says every notable
// change is recorded there.
//
// Silent for a project that keeps no CHANGELOG.md — this gate reports a
// promise the project made, and never invents one it did not.
export function checkChangelogImpact(projectRoot, changeDir) {
  const signals = documentedSurfaceSignals(changeDir, projectRoot);
  if (signals.length === 0) {
    return { ok: true, signals, touched: [], reason: "touches no documented surface" };
  }
  if (!isFile(path.join(projectRoot, CHANGELOG))) {
    return { ok: true, signals, touched: [], reason: `no ${CHANGELOG} in this project` };
  }
  if (!isRepo(projectRoot)) {
    return { ok: true, signals, touched: [], reason: "not a git repository — cannot tell what moved" };
  }
  const touched = changedFiles(projectRoot, { mergeBase: true })
    .files.filter((f) => f === CHANGELOG);
  if (touched.length > 0) {
    return { ok: true, signals, touched, reason: `recorded in ${CHANGELOG}` };
  }
  return {
    ok: false,
    signals,
    touched,
    reason: `alters a documented surface but ${CHANGELOG} does not say so`,
  };
}

const CHANGELOG = "CHANGELOG.md";

// Where THIS project keeps its documentation, read off its own tree.
//
// The gate is portable; the instruction it printed was not. It named
// `docs/en/` AND `docs/pt/` and a skill that exists only in Doctrina's own
// repository, so an adopting project with neither read that it had to
// translate (change 0058). The gate itself never asked for any of that — it
// accepts anything under `docs/` or a README — so the remedy is derived from
// what the checked project actually has.
//
// Returns the documentation homes in reading order, or [] for a project that
// has none yet.
export function documentationHomes(projectRoot) {
  const homes = [];
  const docsDir = path.join(projectRoot, "docs");
  // Only a directory that holds prose is somewhere to write prose: naming
  // `docs/assets/` — an SVG and nothing else — turned change 0058's portable
  // hint into a five-item list with a wrong item in it.
  const holdsMarkdown = (dir) => walk(dir).some((f) => f.endsWith(".md"));
  if (isDir(docsDir)) {
    // A per-language or per-audience split is a convention, not a rule: name
    // the subdirectories this project HAS, and fall back to `docs/` itself.
    const subs = readdirSync(docsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .filter((e) => holdsMarkdown(path.join(docsDir, e.name)))
      .map((e) => `docs/${e.name}/`)
      .sort();
    if (subs.length > 0) homes.push(...subs);
    else if (holdsMarkdown(docsDir)) homes.push("docs/");
  }
  for (const readme of ["README.md", "README.pt.md"]) {
    if (isFile(path.join(projectRoot, readme))) homes.push(readme);
  }
  return homes;
}

// The hint the docs gate prints when it refuses. Names the places this
// project documents in, and says "a README" when it documents nowhere yet —
// never a path the checked project does not have.
export function docsRemedy(projectRoot) {
  const homes = documentationHomes(projectRoot);
  if (homes.length === 0) return "document it in a README, or under docs/";
  if (homes.length === 1) return `document it in ${homes[0]}`;
  const last = homes[homes.length - 1];
  return `document it in ${homes.slice(0, -1).join(", ")} or ${last}` +
    (homes.length > 2 ? " — whichever this change belongs in" : "");
}

// The gate itself: { ok, signals, touched, reason }. `ok` is true when the
// change touches no documented surface, when documentation moved with it,
// or when git cannot answer.
export function checkDocsImpact(projectRoot, changeDir) {
  const signals = documentedSurfaceSignals(changeDir, projectRoot);
  if (signals.length === 0) {
    return { ok: true, signals, touched: [], reason: "touches no documented surface" };
  }
  if (!isGitRepo(projectRoot)) {
    return { ok: true, signals, touched: [], reason: "not a git repository — cannot tell what moved" };
  }
  const touched = docsTouched(projectRoot);
  if (touched.length > 0) {
    return { ok: true, signals, touched, reason: `documentation moved with it (${touched.length} file${touched.length === 1 ? "" : "s"})` };
  }
  return {
    ok: false,
    signals,
    touched,
    reason: "alters a documented surface but no docs/ or README change accompanies it",
  };
}

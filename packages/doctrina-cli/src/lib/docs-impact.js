// @ts-check
import path from "node:path";
import { isFile, read, walk } from "./fs-ops.js";
import { COMMAND_NAMES } from "./commands.js";
import { locateTemplatesDir } from "./templates.js";
import { changedFiles, isRepo } from "./git.js";
import { maskComments } from "./doc-model.js";

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

// Does this change alter something the documentation makes promises about?
// Read from the change's own artifacts — the deltas it will merge into
// specs, plus the proposal that states its shape. Returns the list of
// signals found (empty when the change touches no documented surface).
export function documentedSurfaceSignals(changeDir) {
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
  if (isFile(proposal)) sources.push(authored(read(proposal)));
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

  const flags = new Set();
  for (const m of code.matchAll(/--([a-z][a-z0-9-]{2,})/g)) flags.add(`--${m[1]}`);
  if (flags.size > 0) {
    signals.push(`flags: ${[...flags].sort().slice(0, 8).join(", ")}`);
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

// The gate itself: { ok, signals, touched, reason }. `ok` is true when the
// change touches no documented surface, when documentation moved with it,
// or when git cannot answer.
export function checkDocsImpact(projectRoot, changeDir) {
  const signals = documentedSurfaceSignals(changeDir);
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

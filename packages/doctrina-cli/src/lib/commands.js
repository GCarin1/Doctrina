// Single canonical list of top-level `doctrina` commands.
//
// This is the one place the command surface is named. `src/index.js` builds
// its dispatch table for these names (an execution-based test asserts every
// name here resolves to a real handler, so the two never drift), and
// `doctrina validate` compares it against the commands AGENTS.md documents —
// the hub the agent reads first — so a stale command catalog or a reference
// to a command that no longer exists becomes a loud signal instead of silent
// rot (the "AGENTS.md is the source of truth but nothing keeps it fresh" gap).
//
// Keep this sorted by the workflow order used in `--help`, not alphabetically.
export const COMMAND_NAMES = [
  // bootstrap / day-to-day
  "init", "intake", "work",
  // authoring
  "spec", "change", "contract", "decision", "skill",
  // read / orient
  "prime", "context", "show", "search", "status", "next", "why", "handoff", "constitution",
  // gates
  "analyze", "clarify", "validate", "coverage", "trace", "review", "verify", "close", "doctor",
  // maintenance
  "templates", "hooks", "index", "watch", "metrics", "report", "completion",
];

// The full operation surface — every `doctrina <command> [<subcommand>]` a
// user can invoke, each with the one-line summary `--help` prints. This is
// the single source the top-level help is GENERATED from, so an operation
// that exists in a dispatch switch but not here is now a loud test failure
// instead of a hidden feature (`spec set` / `change abandon` shipped and
// stayed invisible to `--help`, AGENTS.md, and the CLI reference — the exact
// drift the AGENTS.md gate could not see because its catalog stops at the
// top-level names). Tests assert: every op resolves to a real handler, the
// top-level words equal COMMAND_NAMES, and the cli-reference docs cover
// every op.
export const OPERATIONS = [
  ["init", "Scaffold AGENTS.md and .doctrina/ in the current directory"],
  ["intake", "Store the full project description; print the bootstrap playbook"],
  ["work", "Brief prompt -> scaffolded change + guided work playbook"],
  ["spec new", "Create a new capability spec (--bug for bug-shape)"],
  ["spec list", "List specs with version, status, and size"],
  ["spec set", "Edit spec headers / a criterion mark and resync the index"],
  ["change new", "Open a change proposal"],
  ["change apply", "Apply spec deltas (ADDED/REMOVED auto, MODIFIED manual)"],
  ["change archive", "Archive an applied change"],
  ["change diff", "Preview spec deltas (line diff for MODIFIED)"],
  ["change abandon", "Discard an open change cleanly (recorded in the ledger)"],
  ["contract new", "Own the integration surface (ports, env, interfaces)"],
  ["contract list", "List contracts with status and last-updated date"],
  ["contract check", "Verify port collisions, env drift, referenced specs"],
  ["decision new", "Create the next sequentially numbered ADR"],
  ["decision accept", "Flip a proposed ADR to accepted"],
  ["decision land", "Record that an accepted ADR is now implemented (non-mutating)"],
  ["decision supersede", "Create a new ADR that supersedes an existing one"],
  ["decision list", "List ADRs with status, date, and title"],
  ["skill new", "Scaffold an on-demand procedural memory skill"],
  ["skill list", "List skills with their descriptions"],
  ["skill sync", "Mirror skill frontmatter descriptions into index.json"],
  ["skill suggest", "Surface fix-shaped lessons worth a skill (--write scaffolds)"],
  ["analyze", "Inspect a change folder before applying"],
  ["clarify", "Smell-test a Markdown file for ambiguity (--all for the tree)"],
  ["prime", "Session primer: gates, rules, open work, next steps in one read"],
  ["context", "Print the context pack for a task in read order"],
  ["show", "Point-read a requirement/criterion/ADR (cli-R12, cli-C3, 0007)"],
  ["search", "Search the artifact tree, grouped by category"],
  ["validate", "Run schema and structural checks"],
  ["coverage", "Report acceptance criteria with linked evidence (--strict gates)"],
  ["trace", "Report intent provenance: product intent → specs (--strict gates)"],
  ["review", "Conformance review of your changes vs specs/ADRs/contracts"],
  ["verify", "Run project-declared typecheck/test/build checks (the real gate)"],
  ["close", "Run the whole close sequence for a change in one pass"],
  ["doctor", "Aggregate diagnostic with per-finding remediation (a driver)"],
  ["status", "One-glance project health dashboard"],
  ["why", "Explain provenance: a capability's chain, or an anchor's (SC1)"],
  ["handoff", "Markdown handoff note: open work, task state, resume command"],
  ["constitution", "Print the standing rules: accepted ADRs + product non-goals"],
  ["templates list", "List the templates shipped by the installed CLI"],
  ["templates check", "Compare the project against the recommended template shape"],
  ["templates update", "Additive fixer for check findings (preview; --write applies)"],
  ["hooks install", "Install the pre-commit hook"],
  ["index rebuild", "Regenerate index.json from the artifacts on disk"],
  ["next", "Print the recommended next workflow actions"],
  ["watch", "Re-run validate --fix + next on every change (--once for one pass)"],
  ["metrics", "Local git-derived adoption metrics (no network)"],
  ["report", "Markdown digest for a period: changes, gates, git summary"],
  ["completion", "Print bash/zsh/pwsh completions (generated from the catalog)"],
];

// The Commands block of `doctrina --help`, generated from OPERATIONS so the
// printed surface can never omit an operation the catalog knows about.
export function surfaceHelp() {
  return OPERATIONS.map(([op, summary]) => `  ${op.padEnd(21)}${summary}`).join("\n");
}

// Extract the set of top-level `doctrina <command>` references that appear in
// CODE context (fenced blocks or inline backtick spans) of a Markdown file —
// AGENTS.md, typically. Restricting to code context avoids matching prose like
// "the doctrina framework", which is not a command reference. Both the bare
// `doctrina <cmd>` and the `npx doctrina-cli <cmd>` forms are recognised.
export function referencedCommands(markdown) {
  const out = new Set();
  const chunks = [];
  // Pull fenced blocks first and strip them out, so the inline-span scan below
  // cannot mis-pair backticks across a fence boundary (a fence's own backticks
  // would otherwise shift which inline spans pair up).
  const rest = markdown.replace(/```[\s\S]*?```/g, (block) => {
    chunks.push(block);
    return "\n";
  });
  for (const m of rest.matchAll(/`[^`]+`/g)) chunks.push(m[0]);
  const hay = chunks.join("\n");
  for (const m of hay.matchAll(/(?:npx\s+doctrina-cli|doctrina)\s+([a-z][a-z-]+)/g)) {
    out.add(m[1]);
  }
  return out;
}

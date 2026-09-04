// @ts-check
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
  "init", "intake", "triage", "work",
  // authoring
  "spec", "change", "contract", "decision", "skill", "intent", "adapter",
  // read / orient
  "prime", "context", "show", "search", "status", "next", "why", "handoff", "constitution",
  // gates
  "analyze", "clarify", "validate", "coverage", "trace", "review", "verify", "close", "doctor",
  // maintenance
  "templates", "hooks", "index", "watch", "metrics", "report", "completion", "upgrade",
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
  ["triage", "Classify a request into a lane, and check the runtime surface"],
  ["work", "Brief prompt -> scaffolded change + guided work playbook"],
  ["spec new", "Create a new capability spec (--bug for bug-shape)"],
  ["spec list", "List specs with version, status, and size"],
  ["spec set", "Edit spec headers / a criterion mark and resync the index"],
  ["change new", "Open a change proposal"],
  ["change apply", "Apply spec deltas (ops blocks mechanically; batch ids ok)"],
  ["change archive", "Archive an applied change (batch ids ok)"],
  ["change check", "Pre-close dry-run: everything close would refuse, listed first"],
  ["change tick", "List/tick the unchecked boxes (tasks + verification; --all)"],
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
  ["decision scope", "Show and propose the capabilities each ADR governs"],
  ["skill new", "Scaffold an on-demand procedural memory skill"],
  ["skill list", "List skills with their descriptions"],
  ["skill sync", "Mirror skill frontmatter descriptions into index.json"],
  ["skill suggest", "Surface fix-shaped lessons worth a skill (--write scaffolds)"],
  ["adapter list", "Inventory agent adapters: installed / available / native"],
  ["adapter add", "Install one agent adapter (additive; never touches AGENTS.md)"],
  ["adapter remove", "Delete the files an adapter installed"],
  ["intent add", "Append a new product intent anchor post-intake (- [SC5] ...)"],
  ["intent list", "List product.md intent anchors in document order"],
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
  ["upgrade", "Bring an existing project up to the installed CLI (--write applies)"],
];

// ---------------------------------------------------------------------------
// Per-command PURPOSE and WHEN (audit item M2).
//
// The generated surface block was a name index. An agent reading
// "`doctrina trace --strict`" learns that the command exists and nothing
// about what triggers it, what it costs, or what it returns — so learning
// the surface meant running `--help` 35 times, roughly the whole context
// budget spent on a lookup.
//
// Doctrina already solved this for SKILLS: `context` prints a description
// and a `when:` trigger per skill and tells the agent to load the body only
// when the trigger fires. Commands get the same treatment.
//
// `when` is the moment you reach for it, in the agent's own terms.
// `purpose` is one line on what it does. Both are required: a command that
// cannot state its trigger has not earned a place on the surface, and
// `templates check` fails when either is missing.
export const COMMAND_META = {
  init:         { moment: "Bootstrap",  when: "starting a project that has no AGENTS.md yet", purpose: "scaffold AGENTS.md and .doctrina/" },
  intake:       { moment: "Bootstrap",  when: "you have a full project description and no specs yet", purpose: "store the intent and print the bootstrap playbook" },
  adapter:      { moment: "Bootstrap",  when: "adding or removing an agent's pointer files", purpose: "install/remove agent adapters (additive)" },

  prime:        { moment: "Orient",     when: "at the START of every session", purpose: "gates, standing rules, and open work in one read" },
  status:       { moment: "Orient",     when: "you need the health of the tree at a glance", purpose: "index, coverage, trace, and artifact counts" },
  next:         { moment: "Orient",     when: "you finished something and do not know what follows", purpose: "the recommended next workflow action" },
  context:      { moment: "Orient",     when: "before working on any task, to load the right files", purpose: "the read pack, assembled to fit a token budget" },
  show:         { moment: "Orient",     when: "you need one requirement, criterion, or ADR, not a file", purpose: "point-read a single artifact by reference" },
  search:       { moment: "Orient",     when: "you do not know which artifact mentions a term", purpose: "search the artifact tree, grouped by category" },
  why:          { moment: "Orient",     when: "you need to justify or trace a capability's existence", purpose: "provenance: intent, proof, ADRs, and history" },
  constitution: { moment: "Orient",     when: "you need the standing rules before deciding something", purpose: "accepted ADRs and product non-goals" },
  handoff:      { moment: "Orient",     when: "BEFORE compaction or handing over to another session", purpose: "a resume note: open work, task state, next command" },

  triage:       { moment: "Change",     when: "a request arrives — BEFORE scaffolding, especially if it smells like an incident", purpose: "classify the lane (product/runtime/chore) and check the declared runtime surface" },
  work:         { moment: "Change",     when: "a request arrives that changes behaviour (triage says PRODUCT)", purpose: "scaffold a change and print the playbook to execute" },
  spec:         { moment: "Change",     when: "a capability needs creating or its headers advancing", purpose: "create, list, and edit capability specs" },
  change:       { moment: "Change",     when: "driving a change through its lifecycle by hand", purpose: "new / apply / archive / check / tick / diff / abandon" },
  decision:     { moment: "Change",     when: "the change decides something a later session must not relitigate", purpose: "record, accept, land, scope, and supersede ADRs" },
  contract:     { moment: "Change",     when: "the change touches ports, env vars, or public endpoints", purpose: "own and verify the integration surface" },
  intent:       { moment: "Change",     when: "new product intent appears after the intake", purpose: "append and list product intent anchors" },
  skill:        { moment: "Change",     when: "a lesson is worth not relearning", purpose: "capture on-demand procedural memory" },

  analyze:      { moment: "Gate",       when: "before applying a change", purpose: "structural pre-flight on a change folder" },
  clarify:      { moment: "Gate",       when: "before applying, or before opening a PR", purpose: "smell-test Markdown for ambiguity" },
  validate:     { moment: "Gate",       when: "after any artifact edit, and before considering work done", purpose: "schema, structure, EARS, and index drift" },
  coverage:     { moment: "Gate",       when: "before claiming a capability is proven", purpose: "acceptance criteria against cited evidence" },
  trace:        { moment: "Gate",       when: "checking that product intent still maps to capabilities", purpose: "intent provenance across the tree" },
  review:       { moment: "Gate",       when: "before handing work back, to self-review it", purpose: "conformance of your changes vs specs/ADRs/contracts" },
  verify:       { moment: "Gate",       when: "the real build gate must run", purpose: "the project's declared typecheck/test/build checks" },
  close:        { moment: "Gate",       when: "a change is implemented and ready to finish", purpose: "the whole closing sequence in one attested pass" },
  doctor:       { moment: "Gate",       when: "something looks wrong and you do not know which gate to ask", purpose: "aggregate diagnostic with per-finding remedies" },

  templates:    { moment: "Maintain",   when: "after upgrading the CLI, or to customise a scaffold", purpose: "inspect, check, and refresh the template shape" },
  upgrade:      { moment: "Maintain",   when: "you just updated the doctrina-cli package", purpose: "bring this project up to the installed CLI" },
  index:        { moment: "Maintain",   when: "the index drifted from the tree", purpose: "regenerate index.json from the artifacts on disk" },
  hooks:        { moment: "Maintain",   when: "setting up a repo so drift cannot be committed", purpose: "install the pre-commit gate" },
  watch:        { moment: "Maintain",   when: "you want the tree re-synced on every save", purpose: "re-run validate --fix and next continuously" },
  metrics:      { moment: "Maintain",   when: "reporting adoption over a period", purpose: "local git-derived adoption metrics" },
  report:       { moment: "Maintain",   when: "summarising a period for a human", purpose: "a Markdown digest of changes, gates, and git" },
  completion:   { moment: "Maintain",   when: "setting up a human's shell", purpose: "print shell completions from the catalog" },
};

// The order moments appear in the generated block.
export const MOMENTS = ["Bootstrap", "Orient", "Change", "Gate", "Maintain"];

// The Commands block of `doctrina --help`, generated from OPERATIONS so the
// printed surface can never omit an operation the catalog knows about.
export function surfaceHelp() {
  return OPERATIONS.map(([op, summary]) => `  ${op.padEnd(21)}${summary}`).join("\n");
}

// ---------------------------------------------------------------------------
// The CLI-owned AGENTS.md command-surface block (operator review 2026-07-19,
// meta-conclusion): for an agent, AGENTS.md IS the discovery interface — it
// never runs `--help` spontaneously — so every command absent from the hub
// was invisible for ~35 changes (`prime`, `handoff`, `doctor`, `show`, ...).
// The fix is a marker-delimited section GENERATED from OPERATIONS, so the
// hub's catalog is the CLI's catalog by construction: `init` scaffolds it,
// `templates check` flags it stale, and `templates update --write` (hence
// `doctrina upgrade --write`) regenerates exactly the marked span and
// nothing else. Content between the markers is CLI-owned; everything
// outside remains the adopter's, under the additive-only guarantee.

export const SURFACE_BEGIN =
  "<!-- doctrina:surface:begin — CLI-owned block, generated from the installed command catalog. Refreshed by `doctrina upgrade --write`; edits inside are overwritten. -->";
export const SURFACE_END = "<!-- doctrina:surface:end -->";


// Per-command usage hints appended to the generated reference — arguments and
// the flags an agent reaches for daily. Cosmetic only; the operation list
// itself always comes from OPERATIONS.
const SURFACE_HINTS = {
  work: '"<prompt>" (--capability · --chore · --from-diff · --quiet)',
  context: "[<cap>] --for \"<task>\" --concat",
  validate: "(--fix)",
  coverage: "--strict",
  trace: "--strict",
  clarify: "--all (--lang pt|en)",
  close: "<id...>",
  upgrade: "--write",
  prime: "(session start)",
  handoff: "(before compaction/handover)",
};

// The declared size budget for the generated block. A surface that cannot
// describe itself in this many lines is too large — the answer is to cut
// commands (M8), never to raise the number.
export const SURFACE_LINE_BUDGET = 40;

// Moments an agent works IN get a trigger per command. "Maintain" is
// compressed to one line: those commands are reached for by a human after
// an upgrade or when wiring a repo, not by an agent mid-loop, and giving
// each its own line pushed the block past its budget. The budget is the
// forcing function — a surface that cannot describe itself in 40 lines is
// too large, and the answer is to cut commands (M8), not to raise it.
const COMPACT_MOMENTS = new Set(["Maintain"]);

// The full managed section, heading included, between the markers.
//
// Organised by MOMENT rather than by category, and each line carries the
// trigger: an agent scanning it learns WHEN to reach for a command, which
// a name index never told it. Same shape `context` prints for skills —
// description plus `when:`, body on demand.
export function surfaceMarkdown() {
  const subsByCmd = new Map();
  for (const [op] of OPERATIONS) {
    const [cmd, sub] = op.split(" ");
    if (!subsByCmd.has(cmd)) subsByCmd.set(cmd, []);
    if (sub) subsByCmd.get(cmd).push(sub);
  }
  const invocation = (cmd) => {
    const subs = subsByCmd.get(cmd) ?? [];
    const hint = SURFACE_HINTS[cmd] ? ` ${SURFACE_HINTS[cmd]}` : "";
    return subs.length > 0 ? `${cmd} ${subs.join("|")}` : `${cmd}${hint}`;
  };

  const lines = [
    "## Doctrina command surface (generated — reach for these, don't hand-author)",
    "",
    // Two lines, not three. This block is always-loaded context inside a
    // file with a hard 150-line budget, so its own preamble competes with
    // the commands it introduces — and a command an agent never discovers
    // costs more than a sentence of prose ever saves.
    "Every command, with the moment you reach for it. The CLI scaffolds from",
    "canonical templates and syncs `index.json`. Flags: `doctrina <cmd> --help`.",
  ];
  for (const moment of MOMENTS) {
    const cmds = COMMAND_NAMES.filter((n) => COMMAND_META[n]?.moment === moment);
    if (cmds.length === 0) continue;
    if (COMPACT_MOMENTS.has(moment)) {
      // Each name still carries the `doctrina ` prefix: the compact line is
      // read by validate's drift gate too, which only recognises a command
      // reference in that form.
      lines.push(`**${moment}** (triggers: \`doctrina <command> --help\`) — ` +
        cmds.map((n) => `\`doctrina ${invocation(n)}\``).join(" · "));
      continue;
    }
    lines.push(`**${moment}**`);
    for (const cmd of cmds) {
      const meta = COMMAND_META[cmd];
      lines.push(`- \`doctrina ${invocation(cmd)}\` — ${meta.purpose}. *When:* ${meta.when}.`);
    }
  }
  return lines.join("\n");
}

// The block as written to AGENTS.md: markers wrapping the generated section.
export function surfaceBlock() {
  return `${SURFACE_BEGIN}\n${surfaceMarkdown()}\n${SURFACE_END}`;
}

// The block's CANONICAL POSITION, defined once — by the shipped template,
// which is the only place the intended layout exists.
//
// `templates update` used to APPEND the block, so the same CLI produced two
// different AGENTS.md layouts: third section on a fresh `init`, dead last
// after an `upgrade` — behind 117 lines the agent reads first, which is the
// attention problem design principle #2 exists to prevent, and with no
// heading of its own before it, so a hierarchical parse read the command
// surface as content of "## What never goes in this file" (audit item C4).
//
// Returns { after, before }: the heading text the block follows in the
// template, and the heading it precedes. Either may be null.
export function surfaceAnchors(templateText) {
  const block = findSurfaceBlock(templateText);
  if (!block) return { after: null, before: null };
  const headingsBefore = [...templateText.slice(0, block.start).matchAll(/^##\s+.*$/gm)];
  const headingAfter = templateText.slice(block.end).match(/^##\s+.*$/m);
  return {
    after: headingsBefore.length > 0 ? headingsBefore[headingsBefore.length - 1][0].trim() : null,
    before: headingAfter ? headingAfter[0].trim() : null,
  };
}

// Place `block` into `text` at the canonical position, returning the new
// text. Used by both `init` (via the template, which already has it there)
// and `templates update` (on a project that has none), so the two produce
// the same layout and running it twice is a no-op.
export function placeSurfaceBlock(text, block, anchors) {
  const existing = findSurfaceBlock(text);
  if (existing) return text.slice(0, existing.start) + block + text.slice(existing.end);

  const lines = text.split("\n");
  const headingIndex = (heading) =>
    heading ? lines.findIndex((l) => l.trim() === heading) : -1;

  // A section ends at the next heading OR at the start of another CLI-owned
  // block. The marker comment precedes that block's heading, so scanning for
  // headings alone would place this block BETWEEN a marker and its own
  // heading — nesting the two, after which the next regeneration treats the
  // outer span as stale and deletes everything inside it. That corrupted a
  // real file before this guard existed.
  const isBoundary = (line) => /^##\s+/.test(line) || /^\s*<!--\s*doctrina:\w+:begin/.test(line);

  // Preferred: immediately after the section the template puts it after.
  const afterIdx = headingIndex(anchors.after);
  if (afterIdx >= 0) {
    let end = afterIdx + 1;
    while (end < lines.length && !isBoundary(lines[end])) end += 1;
    const head = lines.slice(0, end).join("\n").replace(/\s+$/, "");
    const tail = lines.slice(end).join("\n");
    return `${head}\n\n${block}\n\n${tail}`.replace(/\n{3,}/g, "\n\n");
  }

  // Next: immediately before the section the template puts it before.
  const beforeIdx = headingIndex(anchors.before);
  if (beforeIdx >= 0) {
    const head = lines.slice(0, beforeIdx).join("\n").replace(/\s+$/, "");
    const tail = lines.slice(beforeIdx).join("\n");
    return `${head}\n\n${block}\n\n${tail}`.replace(/\n{3,}/g, "\n\n");
  }

  // Last resort: append, with a trailing newline so the file stays well-formed.
  return `${text.replace(/\s+$/, "")}\n\n${block}\n`;
}

// Locate the managed block in an AGENTS.md text. Returns
// { start, end, inner } (string offsets; inner excludes the marker lines)
// or null when either marker is absent.
export function findSurfaceBlock(text) {
  return findMarkedBlock(text, "surface");
}

// Shared locator for the CLI-owned marker blocks (surface, changed).
// Returns { start, end, inner } as string offsets, or null when either
// marker is missing.
function findMarkedBlock(text, name) {
  // Note the doubled backslashes: these are TEMPLATE literals, so `\s`
  // would collapse to a bare "s" before the RegExp ever sees it.
  const begin = text.match(new RegExp(`<!--\\s*doctrina:${name}:begin[\\s\\S]*?-->`));
  if (!begin) return null;
  const endRe = new RegExp(`<!--\\s*doctrina:${name}:end\\s*-->`);
  const end = endRe.exec(text.slice(begin.index + begin[0].length));
  if (!end) return null;
  const innerStart = begin.index + begin[0].length;
  return {
    start: begin.index,
    end: innerStart + end.index + end[0].length,
    inner: text.slice(innerStart, innerStart + end.index).replace(/^\r?\n|\r?\n$/g, ""),
  };
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

// ---------------------------------------------------------------------------
// The agent-facing changelog (M2, part 3).
//
// Reported from real use: when a new command shipped, the LLM driving
// Doctrina had no idea the capability existed. It only found out by running
// `doctrina --help` — which it had no reason to run, because nothing told
// it anything had changed.
//
// CHANGELOG.md is 46 KB of human prose and far too large to carry into a
// context window. This is three to six lines stating only what alters
// AGENT behaviour: a new capability, a changed trigger, a removed command.
// `upgrade --write` refreshes it, so an agent reading AGENTS.md after an
// upgrade learns what is new without being told to look.

export const AGENT_CHANGELOG_BEGIN =
  "<!-- doctrina:changed:begin — CLI-owned. Regenerated by `doctrina upgrade --write`. -->";
export const AGENT_CHANGELOG_END = "<!-- doctrina:changed:end -->";

// What changed for an AGENT, per version. Keyed by the version that
// introduced it. Only entries that alter what an agent should DO belong
// here — a bug fix nobody's behaviour depends on does not.
export const AGENT_CHANGELOG = {
  "0.15.0": [
    "`doctrina triage \"<prompt>\"` — classify a request as PRODUCT / RUNTIME / CHORE BEFORE scaffolding. `work` now holds a runtime-shaped prompt with exit 3 and points here; `--force` opens the change anyway.",
    "`contract check` now holds the declared wiring to the implementation: a `vars`/`secrets` variable no workflow exports, a default an empty CI value never triggers, an unvalidated enum, a selector matching zero targets (RT01-RT05).",
    "A `verify` check may declare `expect`, so a run that exits 0 having executed NOTHING fails the gate; an `[orchestration]` acceptance criterion is proven by citing such a guarded check (`verify:<name>`), not by a citation that merely resolves.",
    "A spec may declare an ordered `### Pipeline`; `validate` refuses a step that requires what a later step produces. `validate --runtime` adds the runtime gate.",
    "`skill suggest --from-error <text|file>` drafts a skill from the failure on screen; `context --for` now ranks skills by their trigger.",
  ],
  "0.14.0": [
    "`doctrina adapter add|remove|list` — add an agent without re-scaffolding; `init --force` no longer overwrites authored AGENTS.md/product.md.",
    "`doctrina change apply` now refuses what `analyze` refuses; `change check` previews a close, `change tick` checks boxes in bulk.",
    "Exit codes are a 5-class contract: 1 gate, 2 usage, 3 precondition, 4 environment. Branch on the code, not the prose.",
    "A change that alters a documented surface must carry its docs — `close` refuses otherwise (`--force` records the gap).",
    "Project templates under `.doctrina/templates/` now override the bundled ones, per file.",
  ],
};

// The block written into AGENTS.md for a given version. Empty string when
// that version has no agent-visible changes.
export function agentChangelogMarkdown(version) {
  const entries = AGENT_CHANGELOG[version];
  if (!entries || entries.length === 0) return "";
  return [
    `## What changed in ${version}`,
    "",
    ...entries.map((e) => `- ${e}`),
  ].join("\n");
}

export function agentChangelogBlock(version) {
  const md = agentChangelogMarkdown(version);
  if (!md) return "";
  return `${AGENT_CHANGELOG_BEGIN}\n${md}\n${AGENT_CHANGELOG_END}`;
}

export function findAgentChangelogBlock(text) {
  return findMarkedBlock(text, "changed");
}

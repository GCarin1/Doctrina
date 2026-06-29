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
  "context", "search", "status", "next", "why", "constitution",
  // gates
  "analyze", "clarify", "validate", "coverage", "trace", "review", "verify", "close",
  // maintenance
  "templates", "hooks", "index", "watch", "metrics",
];

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

// @ts-check
import { c } from "./colors.js";
import { readTemplate, substitute } from "./templates.js";

// Playbooks are TEMPLATES, not code (audit finding F17).
//
// `printPlaybook()` was ~100 lines of literal `console.log` — including the
// documentation of the ops grammar — and the same procedure was written out
// again in AGENTS.md and twice more in docs/{en,pt}/workflow.md. Four homes
// for one fact, in the framework whose first design principle is that a fact
// has exactly one.
//
// Worse for adopters: a team whose process differs (an extra review step, a
// different close) had no way to say so. Every other scaffold resolves
// project-over-bundled per file (ADR 0019); the procedure the agent actually
// executes was the one thing hard-coded.
//
// So a playbook resolves through the same chain, and this module renders it.
//
// ---------------------------------------------------------------------------
// The markup
// ---------------------------------------------------------------------------
//
// Colour has to survive the move, or the output changes and the migration is
// not faithful. The template marks spans inline:
//
//   [[c]]doctrina close 0001[[/c]]   cyan   — a command to run
//   [[g]]...[[/g]]                   gray   — commentary
//   [[b]]...[[/b]]                   bold   — a heading
//   [[y]]...[[/y]]                   yellow — a warning
//
// Markup is expanded BEFORE token substitution, deliberately: a token's value
// can carry a user's prompt, and a prompt must never be able to inject colour
// into the playbook. Blocks the CLI computes (a capability ranking, a warning
// list) arrive already coloured through `c.*`, so they need no markup.
//
// Everything variable is a TOKEN, and the code pre-renders it. That answers
// the open question the change carried — extend the substituter, or
// pre-render? — in favour of pre-rendering: `substitute` stays a plain
// string map, and the template stays a document rather than becoming a
// programming language with conditionals and loops in it.

const MARKS = { c: c.cyan, g: c.gray, b: c.bold, y: c.yellow };

/** Expand `[[x]]...[[/x]]` colour spans. Innermost first, so spans nest. */
export function expandMarkup(text) {
  let out = String(text);
  let previous;
  do {
    previous = out;
    out = out.replace(/\[\[([cgby])\]\]((?:(?!\[\[[cgby]\]\])[\s\S])*?)\[\[\/\1\]\]/g,
      (_, mark, body) => MARKS[mark](body));
  } while (out !== previous);
  return out;
}

/**
 * Render a named playbook, resolved project-over-bundled.
 *
 * Returns the text; the caller prints it. Keeping the write at the edge is
 * what lets a test assert the rendering without capturing stdout.
 */
export function renderPlaybook(projectRoot, name, tokens = {}) {
  const tpl = readTemplate(projectRoot, `playbooks/${name}.md.template`);
  // A trailing newline in the file would print an extra blank line; the
  // caller decides its own spacing.
  return substitute(expandMarkup(dropEmptyBlocks(tpl.body, tokens)), tokens).replace(/\n$/, "");
}

/**
 * A line holding NOTHING but one token, whose value is empty or absent, is
 * removed rather than left as a blank line.
 *
 * That single rule is what lets the optional parts of a playbook — the
 * thin-prompt warning, the capability hint, the backfill note — be plain
 * tokens on their own line instead of conditionals in a template language.
 * A block that IS present brings its own spacing in its value.
 */
function dropEmptyBlocks(body, tokens) {
  return body
    .split("\n")
    .filter((line) => {
      const m = line.match(/^\s*\{\{(\w+)\}\}\s*$/);
      if (!m) return true;
      const value = tokens[m[1]];
      return value !== undefined && String(value) !== "";
    })
    .join("\n");
}

/** Render and print. The one place a playbook reaches stdout. */
export function printPlaybookTemplate(projectRoot, name, tokens = {}) {
  console.log(renderPlaybook(projectRoot, name, tokens));
}

/** The playbooks the CLI ships and `templates check` expects to resolve. */
export const PLAYBOOKS = ["work", "chore", "bootstrap"];

// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE SIXTH AUDIT CHECKS CURSOR AGAINST ITS OWN DOCUMENTATION (change 0237).
//
// Read on 2026-11-05 at cursor.com/docs (agent/hooks, reference/third-party-
// hooks, context/rules, skills, context/subagents). Cursor also runs the
// hooks Claude Code's `.claude/settings.json` declares — "Include Third-Party
// Plugins, Skills, and Other Configs", on by default — mapping SessionStart
// to sessionStart, UserPromptSubmit to beforeSubmitPrompt and PreToolUse to
// preToolUse, and it sets CURSOR_VERSION and CURSOR_PROJECT_DIR for every
// hook. So a folder with both adapters primed the session twice, the second
// time in plain text where Cursor reads JSON; the per-prompt pulse answered
// beforeSubmitPrompt in prose; and the Claude-format guard, with no opinion,
// answered a permission hook — where "invalid JSON … blocks the action" —
// with nothing.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

// Hook events and .mdc frontmatter keys the Cursor documentation lists.
const CURSOR_HOOK_EVENTS = new Set(["sessionStart", "sessionEnd", "preToolUse", "postToolUse", "postToolUseFailure",
  "subagentStart", "subagentStop", "beforeShellExecution", "beforeMCPExecution", "afterShellExecution",
  "afterMCPExecution", "beforeReadFile", "afterFileEdit", "beforeSubmitPrompt", "preCompact", "stop",
  "afterAgentResponse", "afterAgentThought", "beforeTabFileRead", "afterTabFileEdit", "workspaceOpen"]);
const MDC_KEYS = new Set(["description", "globs", "alwaysApply"]);

function sandbox() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit6-"));
  const base = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete base.DOCTRINA_WORKSPACE;
  delete base.CURSOR_VERSION;
  delete base.CURSOR_PROJECT_DIR;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args, { cursor = false, input = "" } = {}) => {
    const env = cursor ? { ...base, CURSOR_VERSION: "2.4.0", CURSOR_PROJECT_DIR: cwd } : base;
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env, input });
    return { status: r.status, stdout: r.stdout, out: r.stdout + r.stderr };
  };
  const project = (/** @type {string} */ name, /** @type {string} */ agent) => {
    const dir = path.join(root, name);
    mkdirSync(dir);
    run(dir, ["init", "--non-interactive", "--project-name", name, "--agent", agent]);
    return dir;
  };
  return { root, run, project, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("the Cursor files the CLI writes use only what Cursor documents", () => {
  const s = sandbox();
  try {
    const dir = s.project("both", "cursor");
    s.run(dir, ["adapter", "add", "claude"]);
    const hooks = JSON.parse(readFileSync(path.join(dir, ".cursor", "hooks.json"), "utf8"));
    assert.equal(hooks.version, 1, "`version` is required and is 1");
    for (const event of Object.keys(hooks.hooks)) assert.ok(CURSOR_HOOK_EVENTS.has(event), `${event} is not a Cursor hook event`);
    for (const file of readdirSync(path.join(dir, ".cursor", "rules")).filter((f) => f.endsWith(".mdc"))) {
      const front = readFileSync(path.join(dir, ".cursor", "rules", file), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      for (const key of front.split("\n").map((l) => l.split(":")[0].trim()).filter(Boolean)) {
        assert.ok(MDC_KEYS.has(key), `${file}: "${key}" is not a documented rule field`);
      }
    }
    s.run(s.root, ["workspace", "init", "ws", "--no-git"]);
    const ws = JSON.parse(readFileSync(path.join(s.root, "ws", ".cursor", "hooks.json"), "utf8"));
    for (const event of Object.keys(ws.hooks)) assert.ok(CURSOR_HOOK_EVENTS.has(event), `workspace: ${event}`);
  } finally {
    s.done();
  }
});

test("under Cursor the Claude-format session hook yields to Cursor's own, or speaks its format", () => {
  const s = sandbox();
  try {
    const both = s.project("both", "cursor");
    s.run(both, ["adapter", "add", "claude"]);
    assert.equal(s.run(both, ["prime", "--hook", "claude"], { cursor: true }).stdout, "",
      "the folder's sessionStart already primes the session — once is enough");
    assert.match(JSON.parse(s.run(both, ["prime", "--hook", "cursor"], { cursor: true }).stdout).additional_context, /Doctrina session primer/);

    const claudeOnly = s.project("claude-only", "claude");
    const answer = s.run(claudeOnly, ["prime", "--hook", "claude"], { cursor: true }).stdout;
    assert.match(JSON.parse(answer).additional_context, /Doctrina session primer/, "the only primer there, in the JSON Cursor reads");
    assert.match(s.run(claudeOnly, ["prime", "--hook", "claude"]).stdout, /^Doctrina session primer/, "Claude Code still gets plain text");

    s.run(s.root, ["workspace", "init", "ws", "--no-git"]);
    assert.equal(s.run(path.join(s.root, "ws"), ["prime", "--hook", "claude"], { cursor: true }).stdout, "", "the workspace root writes both adapters' hooks");
  } finally {
    s.done();
  }
});

test("under Cursor the per-prompt pulse answers beforeSubmitPrompt in its schema", () => {
  const s = sandbox();
  try {
    const dir = s.project("claude-only", "claude");
    s.run(dir, ["work", "Something", "--title", "something", "--chore", "--quiet"]);
    assert.deepEqual(JSON.parse(s.run(dir, ["prime", "--pulse"], { cursor: true }).stdout), { continue: true });
    assert.match(s.run(dir, ["prime", "--pulse"]).stdout, /^Doctrina: open change/, "Claude Code still gets the line");
  } finally {
    s.done();
  }
});

test("under Cursor the Claude-format guard never answers a permission hook with nothing", () => {
  const s = sandbox();
  try {
    const api = path.join(s.root, "api");
    mkdirSync(api);
    spawnSync("git", ["init", "-q"], { cwd: api });
    s.run(s.root, ["workspace", "init", "ws", "--no-git"]);
    const ws = path.join(s.root, "ws");
    s.run(ws, ["workspace", "add", "../api"]);
    s.run(ws, ["workspace", "tool", "jira"]);
    const shell = JSON.stringify({ tool_name: "Shell", tool_input: { command: "ls" } });
    assert.equal(s.run(api, ["workspace", "guard", "--hook", "claude"], { input: shell }).stdout, "",
      "in Claude Code, no opinion stays silent — an allow there would skip the human's prompt");
    const neutral = JSON.parse(s.run(api, ["workspace", "guard", "--hook", "claude"], { cursor: true, input: shell }).stdout);
    assert.equal(neutral.hookSpecificOutput.permissionDecision, "allow");
    const write = JSON.stringify({ tool_name: "createJiraIssue", mcp_server_name: "atlassian", tool_input: "{}" });
    assert.equal(JSON.parse(s.run(api, ["workspace", "guard", "--hook", "claude"], { cursor: true, input: write }).stdout).hookSpecificOutput.permissionDecision, "deny",
      "Cursor's own payload names the server");
  } finally {
    s.done();
  }
});

// What the real agent showed (a planner running SHOP-77, whose third
// criterion asked for the error code `nomeIndisponivel` in a repository
// whose accepted ADR 0001 requires MAIUSCULAS_SNAKE): the planner caught the
// conflict because it read the decisions itself — the executor's card, its
// whole context, named no decision at all.

test("the card carries every global decision with what it decides, and tells the executor to stop on a conflict", () => {
  const s = sandbox();
  try {
    const dir = s.project("api", "claude");
    s.run(dir, ["spec", "new", "login"]);
    const adr = (/** @type {string} */ n, /** @type {string} */ title, /** @type {string} */ scope, /** @type {string} */ body) =>
      writeFileSync(path.join(dir, ".doctrina", "decisions", `${n}-${title.toLowerCase().replace(/\W+/g, "-")}.md`),
        `# ADR ${n} — ${title}\n\n- **Status:** accepted\n- **Date:** 2026-11-05\n${scope}\n## Decision\n\n${body}\n`);
    mkdirSync(path.join(dir, ".doctrina", "decisions"), { recursive: true });
    adr("0001", "Error codes are MAIUSCULAS_SNAKE", "", "Every error response carries `erro` with a MAIUSCULAS_SNAKE code. No other format is accepted.");
    adr("0002", "Billing rounds half-even", "- **Scope:** billing\n", "Half-even.");
    for (let i = 3; i <= 11; i++) adr(String(i).padStart(4, "0"), `Global rule ${i}`, "", `Rule ${i}.`);
    s.run(dir, ["index", "rebuild"]);
    s.run(dir, ["work", "Greeting", "--title", "greeting", "--capability", "login", "--quiet"]);
    const id = String(readdirSync(path.join(dir, ".doctrina", "changes")).find((d) => /^\d{4}-/.test(d)));
    s.run(dir, ["change", "delta", id, "login", "--requirement", "event: When a login succeeds, the system shall answer the display name."]);
    const tasks = path.join(dir, ".doctrina", "changes", id, "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^- \[ \]\n(- \[ \]\n)*/m, "- [ ] Answer the name\n"));
    const card = s.run(dir, ["change", "card", id]).out;
    assert.match(card, /## Decisions that bind it\n\n- ADR 0001 — Error codes are MAIUSCULAS_SNAKE \(`doctrina show 0001`\)\n {2}Every error response carries `erro` with a MAIUSCULAS_SNAKE code\./,
      "a global ADR binds the capability although it never names it, and the card says what it decides");
    assert.doesNotMatch(card, /ADR 0002/, "a decision scoped to another capability does not bind this one");
    assert.match(card, /- … and 2 more accepted global decisions — `doctrina prime --rules`/);
    assert.match(card, /Where the story or the task contradicts one of these, stop and report it/);
  } finally {
    s.done();
  }
});

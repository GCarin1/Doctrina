// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { guardDecision, isWriteCall, splitClaudeToolName, toolEntry } from "../src/lib/workspace-tools.js";

// THE ORCHESTRATOR KNOWS WHAT IT MAY USE (change 0223, ADR 0031).
//
// The workspace declares its tools — which MCP server, for which role, read
// or write — and generates what the agent reads when the operator opens the
// workspace: the hub, the rule, the hooks, the subagents and the multi-root
// folder list. The agent's own pre-call hook asks the workspace before every
// MCP call: a write through a read-only tool is refused, a declared write
// waits for the human.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function workspace() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-tools-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args, input = undefined) =>
    spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env, input });
  const ws = path.join(root, "ws");
  mkdirSync(path.join(root, "back-end"));
  spawnSync("git", ["init", "-q"], { cwd: path.join(root, "back-end") });
  assert.equal(run(root, ["workspace", "init", "ws", "--name", "acme", "--no-git"]).status, 0);
  assert.equal(run(ws, ["workspace", "add", "../back-end", "--role", "back", "--about", "REST API"]).status, 0);
  assert.equal(run(path.join(root, "back-end"), ["spec", "new", "core"]).status, 0);
  return { root, ws, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("a declared tool takes its preset, and a tool without one needs its server", () => {
  const s = workspace();
  try {
    assert.equal(s.run(s.ws, ["workspace", "tool", "jira"]).status, 0);
    assert.equal(s.run(s.ws, ["workspace", "tool", "datadog"]).status, 0);
    assert.equal(s.run(s.ws, ["workspace", "tool", "playwright"]).status, 0);
    const doc = JSON.parse(readFileSync(path.join(s.ws, "workspace.json"), "utf8"));
    assert.deepEqual(doc.tools.map((t) => [t.name, t.server, t.access]),
      [["jira", "atlassian", "read"], ["datadog", "datadog", "read"], ["playwright", "playwright", "read"]]);
    assert.equal(s.run(s.ws, ["workspace", "tool", "grafana"]).status, 2, "no preset, no --server");
    assert.equal(s.run(s.ws, ["workspace", "tool", "grafana", "--server", "grafana", "--for", "observer"]).status, 0);
    assert.equal(s.run(s.ws, ["workspace", "tool", "jira", "--access", "write"]).status, 0, "an update");
    assert.equal(s.run(s.ws, ["workspace", "tool", "jira", "--access", "admin"]).status, 2);
    const listed = s.run(s.ws, ["workspace", "list"]).stdout;
    assert.match(listed, /jira\s+atlassian\s+write/);
    assert.equal(s.run(s.ws, ["workspace", "tool", "grafana", "--remove"]).status, 0);
    assert.doesNotMatch(readFileSync(path.join(s.ws, "workspace.json"), "utf8"), /grafana/);
  } finally {
    s.done();
  }
});

test("the workspace generates what the orchestrating agent reads", () => {
  const s = workspace();
  try {
    s.run(s.ws, ["workspace", "tool", "jira"]);
    s.run(s.ws, ["workspace", "tool", "playwright"]);
    const hub = readFileSync(path.join(s.ws, "AGENTS.md"), "utf8");
    assert.match(hub, /You are the PLANNER/);
    assert.match(hub, /\| back-end \| shadow \| ready \| back \|/);
    assert.match(hub, /\| jira \| `atlassian` \| read \| planner \|/);
    assert.match(hub, /doctrina delivery new/);
    assert.ok(hub.split("\n").length <= 150);
    assert.match(readFileSync(path.join(s.ws, ".cursor", "rules", "00-doctrina-workspace.mdc"), "utf8"), /alwaysApply: true/);
    const hooks = JSON.parse(readFileSync(path.join(s.ws, ".cursor", "hooks.json"), "utf8"));
    assert.equal(hooks.hooks.beforeMCPExecution[0].command, "doctrina workspace guard --hook cursor");
    const claude = JSON.parse(readFileSync(path.join(s.ws, ".claude", "settings.json"), "utf8"));
    assert.equal(claude.hooks.PreToolUse[0].matcher, "mcp__.*");
    const executor = readFileSync(path.join(s.ws, ".claude", "agents", "doctrina-executor.md"), "utf8");
    assert.match(executor, /^---\nname: doctrina-executor\n/);
    assert.match(executor, /model: inherit/);
    assert.match(executor, /Never run `doctrina work`, `close`/);
    const qa = readFileSync(path.join(s.ws, ".claude", "agents", "doctrina-qa.md"), "utf8");
    assert.match(qa, /mcpServers:\n {2}- playwright/);
    assert.match(readFileSync(path.join(s.ws, ".claude", "agents", "doctrina-reviewer.md"), "utf8"), /readonly: true/);
    assert.ok(!existsSync(path.join(s.ws, ".claude", "agents", "doctrina-observer.md")), "no observer without an observability tool");
    const folders = JSON.parse(readFileSync(path.join(s.ws, "acme.code-workspace"), "utf8")).folders;
    assert.deepEqual(folders.map((f) => f.path), [".", "../back-end"]);
  } finally {
    s.done();
  }
});

test("a hook file the operator already has is merged, not replaced", () => {
  const s = workspace();
  try {
    writeFileSync(path.join(s.ws, ".cursor", "hooks.json"), JSON.stringify({ version: 1, hooks: { stop: [{ command: "./mine.sh" }] } }));
    s.run(s.ws, ["workspace", "tool", "jira"]);
    const hooks = JSON.parse(readFileSync(path.join(s.ws, ".cursor", "hooks.json"), "utf8"));
    assert.equal(hooks.hooks.stop[0].command, "./mine.sh");
    assert.ok(hooks.hooks.beforeMCPExecution);
  } finally {
    s.done();
  }
});

test("the guard answers each agent's pre-call hook", () => {
  const s = workspace();
  try {
    s.run(s.ws, ["workspace", "tool", "jira"]);
    s.run(s.ws, ["workspace", "tool", "databricks"]);
    const cursor = (/** @type {object} */ call) => JSON.parse(s.run(s.ws, ["workspace", "guard", "--hook", "cursor"], JSON.stringify(call)).stdout);
    assert.equal(cursor({ mcp_server_name: "atlassian", tool_name: "getJiraIssue", tool_input: "{}" }).permission, "allow");
    const denied = cursor({ mcp_server_name: "atlassian", tool_name: "transitionJiraIssue", tool_input: "{}" });
    assert.equal(denied.permission, "deny");
    assert.match(denied.agent_message, /read-only/);
    assert.equal(cursor({ mcp_server_name: "databricks", tool_name: "execute_sql", tool_input: JSON.stringify({ query: "select * from orders" }) }).permission, "allow");
    assert.equal(cursor({ mcp_server_name: "databricks", tool_name: "execute_sql", tool_input: JSON.stringify({ query: "delete from orders" }) }).permission, "deny");
    assert.equal(cursor({ mcp_server_name: "github", tool_name: "create_pull_request", tool_input: "{}" }).permission, "allow", "an undeclared server is not governed");
    s.run(s.ws, ["workspace", "tool", "jira", "--access", "write"]);
    assert.equal(cursor({ mcp_server_name: "atlassian", tool_name: "addCommentToJiraIssue", tool_input: "{}" }).permission, "ask");
    const claude = (/** @type {object} */ call) => s.run(s.ws, ["workspace", "guard", "--hook", "claude"], JSON.stringify(call));
    const ask = JSON.parse(claude({ tool_name: "mcp__atlassian__createJiraIssue", tool_input: {} }).stdout);
    assert.equal(ask.hookSpecificOutput.permissionDecision, "ask");
    assert.equal(ask.hookSpecificOutput.hookEventName, "PreToolUse");
    const none = claude({ tool_name: "Read", tool_input: {} });
    assert.equal(none.status, 0);
    assert.equal(none.stdout.trim(), "", "a non-MCP tool gets no opinion");
    // Unreadable input never blocks the agent.
    const junk = s.run(s.ws, ["workspace", "guard", "--hook", "cursor"], "not json");
    assert.equal(junk.status, 0);
    assert.equal(JSON.parse(junk.stdout).permission, "allow");
  } finally {
    s.done();
  }
});

test("prime at the workspace root is the orchestrator's primer", () => {
  const s = workspace();
  try {
    s.run(s.ws, ["delivery", "new", "Tela de login", "--projects", "back-end"]);
    const r = s.run(s.ws, ["prime"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Doctrina workspace "acme"/);
    assert.match(r.stdout, /back-end\s+shadow\s+ready/);
    assert.match(r.stdout, /0001-tela-de-login/);
    const hook = JSON.parse(s.run(s.ws, ["prime", "--hook", "cursor"]).stdout);
    assert.match(hook.additional_context, /You are the PLANNER/);
    assert.match(s.run(s.ws, ["prime", "--pulse"]).stdout, /open delivery: 0001-tela-de-login/);
  } finally {
    s.done();
  }
});

test("a write is told from a read by the call, not by the server", () => {
  assert.equal(isWriteCall("getJiraIssue", "{}"), false);
  assert.equal(isWriteCall("transition_issue", {}), true);
  assert.equal(isWriteCall("execute_sql", { sql: "select 'delete' from t" }), false, "a keyword inside a string literal is data");
  assert.equal(isWriteCall("run_query", { query: "UPDATE t SET a = 1" }), true);
  assert.deepEqual(splitClaudeToolName("mcp__datadog__get_logs"), { server: "datadog", tool: "get_logs" });
  assert.equal(splitClaudeToolName("Bash"), null);
  assert.equal(guardDecision([], "x", "delete_all", {}).decision, "none");
  assert.throws(() => toolEntry("Bad Name", {}), /must match/);
});

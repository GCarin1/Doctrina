// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { guardDecision, matchesCall, toolEntry } from "../src/lib/workspace-tools.js";

// THE GUARD TAKES A LIST OF THE CALLS A TOOL MAY MAKE (change 0244).
//
// Whether a call writes is read from its name and input: a list of verbs.
// The fourth audit added forty of them after real MCP servers passed as
// reads, and the next server brings a verb the list has never seen — a
// call nobody recognises is allowed. A tool that declares `only` is judged
// the other way round: what is not named does not pass.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("a call outside a tool's list is denied, whatever its name suggests", () => {
  const jira = { name: "jira", server: "atlassian", access: "read", only: ["getJiraIssue", "search*"] };
  const decide = (/** @type {string} */ tool, tools = [jira]) => guardDecision(tools, "atlassian", tool, "{}");
  assert.equal(decide("getJiraIssue").decision, "allow");
  assert.equal(decide("searchJiraIssuesUsingJql").decision, "allow", "`*` stands for the rest of the name");
  assert.equal(decide("GETJIRAISSUE").decision, "allow", "a server that spells it otherwise is the same call");
  const denied = decide("frobnicateIssue");
  assert.equal(denied.decision, "deny", "no verb the guard knows, and still not a call the workspace named");
  assert.match(denied.reason, /frobnicateIssue is not among the calls the workspace allows through "atlassian" \(jira: getJiraIssue, search\*\)/);
  assert.match(denied.reason, /doctrina workspace tool jira --only "getJiraIssue,search\*,frobnicateIssue"/);
  assert.equal(guardDecision([{ ...jira, only: undefined }], "atlassian", "frobnicateIssue", "{}").decision, "allow", "without a list the name decides, as before");

  // The list narrows; the access still decides what a write does.
  assert.equal(decide("searchAndDeleteIssues").decision, "deny", "named by the list, and a write through a read-only tool");
  assert.equal(guardDecision([{ ...jira, access: "write", only: ["createJiraIssue"] }], "atlassian", "createJiraIssue", "{}").decision, "ask");

  // Two tools on one server: the lists add up, and a tool without one adds nothing.
  const confluence = { name: "confluence", server: "atlassian", access: "read", only: ["getConfluencePage"] };
  assert.equal(decide("getConfluencePage", [jira, confluence]).decision, "allow");
  assert.equal(decide("getConfluenceSpaces", [jira, { ...confluence, only: undefined }]).decision, "deny");
  assert.equal(guardDecision([jira], "figma", "anything", "{}").decision, "none", "another server is not this list's business");
  assert.equal(matchesCall(["get.issue"], "getXissue"), false, "a dot is a dot");
});

test("--only is stored, replaced, validated and taken away", () => {
  const made = toolEntry("jira", { only: "getJiraIssue, search*" });
  assert.deepEqual(made.only, ["getJiraIssue", "search*"]);
  assert.deepEqual(toolEntry("jira", { access: "write" }, made).only, ["getJiraIssue", "search*"], "another flag leaves the list alone");
  assert.equal("only" in toolEntry("jira", { only: "none" }, made), false);
  assert.throws(() => toolEntry("jira", { only: "get issue" }), /--only takes MCP tool names/);
});

test("the list reaches the guard hook and the files the agents read", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-guard-only-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args, input = "") => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env, input });
    return { status: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
  };
  try {
    const api = path.join(root, "api");
    mkdirSync(api);
    spawnSync("git", ["init", "-q"], { cwd: api });
    run(root, ["workspace", "init", "ws", "--no-git"]);
    const ws = path.join(root, "ws");
    run(ws, ["workspace", "add", "../api"]);
    const declared = run(ws, ["workspace", "tool", "jira", "--only", "getJiraIssue,search*"]);
    assert.match(declared.out, /only these calls pass through "atlassian": getJiraIssue, search\* — every other call is denied/);
    assert.match(run(ws, ["workspace", "list"]).out, /only: getJiraIssue, search\*/);
    assert.match(readFileSync(path.join(ws, "AGENTS.md"), "utf8"), /only getJiraIssue, search\*/);

    const call = (/** @type {string} */ tool) => JSON.stringify({ tool_name: tool, mcp_server_name: "atlassian", tool_input: "{}" });
    assert.match(run(api, ["workspace", "guard", "--hook", "cursor"], call("getJiraIssue")).stdout, /"permission":"allow"/);
    assert.match(run(api, ["workspace", "guard", "--hook", "cursor"], call("lookupAccountId")).stdout, /"permission":"deny"/);
    assert.match(run(api, ["workspace", "guard", "--hook", "claude"], JSON.stringify({ tool_name: "mcp__atlassian__lookupAccountId" })).stdout, /"permissionDecision":"deny"/);

    assert.equal(run(ws, ["workspace", "tool", "jira", "--only", "get issue"]).status, 2);
    run(ws, ["workspace", "tool", "jira", "--only", "none"]);
    assert.match(run(api, ["workspace", "guard", "--hook", "cursor"], call("lookupAccountId")).stdout, /"permission":"allow"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

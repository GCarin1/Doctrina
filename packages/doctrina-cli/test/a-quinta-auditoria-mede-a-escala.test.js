// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE FIFTH AUDIT MEASURES SCALE AND REAL USE (change 0236).
//
// `doctrina workspace guard` runs before EVERY MCP call an agent makes. It
// loaded the whole CLI — 39 commands, the project snapshot, git — to read
// one registry: ~220 ms a call, where Node itself starts in ~30. A QA
// executor's Playwright session clicks a hundred times. And at a workspace
// root with forty open deliveries, `next` printed 162 lines into the
// planner's context.

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..", "src");
const cliEntry = path.join(src, "index.js");

/** Every module a file reaches through its static imports, relative to src/. */
function staticGraph(entry) {
  const seen = new Set();
  const stack = [path.resolve(src, entry)];
  while (stack.length) {
    const file = /** @type {string} */ (stack.pop());
    const rel = path.relative(src, file).split(path.sep).join("/");
    if (seen.has(rel)) continue;
    seen.add(rel);
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/^\s*(?:import|export)\s[^"'`;]*?from\s+"(\.[^"]+)"|^\s*import\s+"(\.[^"]+)"/gm)) {
      stack.push(path.resolve(path.dirname(file), m[1] ?? m[2]));
    }
  }
  return seen;
}

test("the guard's door reaches only the registry reader and the decision", () => {
  const graph = staticGraph("lib/workspace-guard.js");
  for (const heavy of ["lib/snapshot.js", "lib/git.js", "lib/scan.js", "lib/workspace.js", "lib/delivery.js", "commands/workspace.js"]) {
    assert.equal(graph.has(heavy), false, `the guard must not load ${heavy} — it runs on every MCP call (${[...graph].join(", ")})`);
  }
  const entry = readFileSync(cliEntry, "utf8");
  assert.doesNotMatch(entry, /^import \* as \w+ from "\.\/commands\//m, "the entrypoint loads the command it runs, not all of them");
  assert.match(entry, /argv\[0\] === "workspace" && argv\[1\] === "guard"/, "the guard is routed before the command registry");
});

test("the guard answers the same through its own door", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit5-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home"), HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args, input = "") =>
    spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env, input });
  try {
    const api = path.join(root, "api");
    mkdirSync(api);
    spawnSync("git", ["init", "-q"], { cwd: api });
    run(root, ["workspace", "init", "ws", "--no-git"]);
    const ws = path.join(root, "ws");
    run(ws, ["workspace", "add", "../api", "--role", "back"]);
    run(ws, ["workspace", "tool", "jira"]);
    const cursor = (/** @type {string} */ tool) => JSON.stringify({ tool_name: tool, mcp_server_name: "atlassian", tool_input: "{}" });
    assert.match(run(api, ["workspace", "guard", "--hook", "cursor"], cursor("createJiraIssue")).stdout, /"permission":"deny"/);
    assert.match(run(api, ["workspace", "guard", "--hook=cursor"], cursor("getJiraIssue")).stdout, /"permission":"allow"/);
    assert.match(run(api, ["workspace", "guard", "--hook", "claude"], JSON.stringify({ tool_name: "mcp__atlassian__createJiraIssue" })).stdout, /"permissionDecision":"deny"/);
    assert.equal(run(api, ["workspace", "guard", "--hook", "nope"]).status, 2);
    assert.match(run(api, ["workspace", "guard", "--help"]).stdout, /Usage: doctrina workspace/, "--help still takes the ordinary path");
    const outside = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit5-out-"));
    try {
      const none = run(outside, ["workspace", "guard", "--hook", "cursor"], cursor("createJiraIssue"));
      assert.equal(none.status, 0);
      assert.match(none.stdout, /"permission":"allow"/, "no workspace, no opinion — the guard never blocks for want of one");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("next at a workspace root prints the first actions, and --json keeps them all", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit5-many-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
  try {
    run(root, ["workspace", "init", "ws", "--no-git"]);
    const ws = path.join(root, "ws");
    for (const n of ["a", "b"]) {
      mkdirSync(path.join(root, n));
      spawnSync("git", ["init", "-q"], { cwd: path.join(root, n) });
      run(ws, ["workspace", "add", `../${n}`]);
      run(path.join(root, n), ["spec", "new", "core"]);
    }
    for (let i = 1; i <= 7; i++) run(ws, ["delivery", "new", `Story ${i}`, "--projects", "a,b"]);
    const next = run(ws, ["next"]).stdout;
    assert.equal((next.match(/^\d+\. /gm) ?? []).length, 10, next);
    assert.match(next, /… and 4 more — every delivery's state: `doctrina delivery list`; every action: `doctrina next --json`/);
    assert.equal(JSON.parse(run(ws, ["next", "--json"]).stdout).actions.length, 14);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// What the real agent tripped on (a planner running the SHOP-42 delivery
// across two shadowed repositories, end to end, with `claude -p`).

test("a bare review counts an open change's delta as the spec update it is", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit5-review-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  const git = (/** @type {string[]} */ args) => spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir });
  try {
    git(["init", "-q"]);
    mkdirSync(path.join(dir, "src"));
    writeFileSync(path.join(dir, "src", "login.js"), "export const a = 1;\n");
    run(["init", "--non-interactive", "--project-name", "p"]);
    run(["spec", "new", "login"]);
    const spec = path.join(dir, ".doctrina", "specs", "login", "spec.md");
    writeFileSync(spec, readFileSync(spec, "utf8").replace(/^\*\*Implementation:\*\*.*$/m, "**Implementation:** implemented\n**Source:** `src/login.js`"));
    run(["index", "rebuild"]);
    git(["add", "-A"]);
    git(["commit", "-qm", "base"]);
    run(["work", "lock", "--title", "lock", "--capability", "login", "--quiet"]);
    run(["change", "delta", "0001-lock", "login", "--requirement", "event: When a third wrong password arrives, the system shall answer 423."]);
    writeFileSync(path.join(dir, "src", "login.js"), "export const a = 2;\n");
    const review = run(["review"]).stdout;
    assert.doesNotMatch(review, /✗ code under capability "login" changed, but its spec was not updated/,
      "the open change's delta is the spec update; the close merges it");
    assert.match(review, /code under capability "login" changed; its spec is updated when 0001-lock closes/);
    rmSync(path.join(dir, ".doctrina", "changes", "0001-lock"), { recursive: true, force: true });
    assert.match(run(["review"]).stdout, /✗ code under capability "login" changed, but its spec was not updated/, "with no change in flight it is still a break");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the absorb's gates heal the index the hand-written specs leave behind", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit5-absorb-"));
  try {
    writeFileSync(path.join(dir, "package.json"), '{"name":"x"}');
    const env = { ...process.env, NO_COLOR: "1" };
    spawnSync(process.execPath, [cliEntry, "init", "--non-interactive", "--project-name", "x"], { cwd: dir, env });
    const out = spawnSync(process.execPath, [cliEntry, "intake", "--from-code"], { cwd: dir, encoding: "utf8", env }).stdout;
    assert.match(out, /^8\. Gates[\s\S]*doctrina validate --fix {3}\(a spec written by hand leaves index\.json behind/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

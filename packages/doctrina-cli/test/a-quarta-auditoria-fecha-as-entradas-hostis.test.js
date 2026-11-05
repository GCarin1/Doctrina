// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { qarg, qpath } from "../src/lib/shell.js";
import { isWriteCall } from "../src/lib/workspace-tools.js";

// THE FOURTH AUDIT CLOSES THE HOSTILE INPUTS (change 0235).
//
// A tracker title is text the delivery playbook calls data, and the CLI
// pasted it between double quotes into the command lines it prints; a
// repository path with a space broke every `cd`. The MCP guard read SQL
// under four keys only, missed CALL and COPY, an `action` argument and a
// name with no separator, and fired for nothing when the declared server's
// key matched no configuration. And at the workspace root `doctor` and
// `metrics` still said `doctrina init`, while a shadow whose folder was gone
// crashed `attach`.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("an argument is quoted so the shell reads it back verbatim", () => {
  assert.equal(qarg("Login API", "linux"), '"Login API"', "plain text keeps the double quotes every surface printed");
  assert.equal(qarg('Fix "login" $(id)', "linux"), `'Fix "login" $(id)'`);
  assert.equal(qarg("it's $(id)", "linux"), `'it'\\''s $(id)'`);
  assert.equal(qarg("it's $(id)", "win32"), `'it''s $(id)'`);
  assert.equal(qpath("/home/u/repo", "linux"), "/home/u/repo");
  assert.equal(qpath("/home/u/my api", "linux"), '"/home/u/my api"');
  assert.equal(qpath("C:\\work\\api", "win32"), "C:\\work\\api");
  if (process.platform !== "win32") {
    for (const title of ['Fix "login" $(touch PWNED) `id`', "it's; rm -rf x", "a\\b !x"]) {
      const r = spawnSync("sh", ["-c", `printf '%s' ${qarg(title)}`], { encoding: "utf8" });
      assert.equal(r.stdout, title, `the shell reads ${title} back unchanged`);
    }
  }
});

function hostileWorkspace() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit4-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home"), HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
    return { status: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
  };
  const api = path.join(root, "my api");
  mkdirSync(api);
  spawnSync("git", ["init", "-q"], { cwd: api });
  run(root, ["workspace", "init", "ws", "--no-git"]);
  const ws = path.join(root, "ws");
  run(ws, ["workspace", "add", "../my api", "--name", "api", "--role", "back"]);
  run(api, ["spec", "new", "auth"]);
  return { root, ws, api, env, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("the command lines the CLI prints run as printed — no title executes, no path splits", () => {
  const s = hostileWorkspace();
  try {
    const marker = path.join(s.root, "PWNED");
    s.run(s.ws, ["delivery", "new", `Fix "login" $(touch ${marker}) \`id\``, "--projects", "api"]);
    const next = s.run(s.ws, ["next"]).out;
    const line = next.split("\n").map((l) => l.trim()).find((l) => l.startsWith("cd "));
    assert.ok(line, next);
    assert.match(line, /^cd "[^"]*my api" && doctrina work '/);
    assert.match(s.run(s.ws, ["delivery", "status", "1"]).out, /cd "[^"]*my api" && doctrina work 'Fix "login"/);
    if (process.platform !== "win32") {
      const shim = path.join(s.root, "bin");
      mkdirSync(shim);
      writeFileSync(path.join(shim, "doctrina"), `#!/bin/sh\nexec "${process.execPath}" "${cliEntry}" "$@"\n`, { mode: 0o755 });
      const r = spawnSync("sh", ["-c", `${line} --quiet`], { encoding: "utf8", env: { ...s.env, PATH: `${shim}:${process.env.PATH}` } });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.equal(existsSync(marker), false, "the title's $( ) never ran");
      const proposal = readFileSync(path.join(s.api, ".doctrina", "changes", String(r.stdout.match(/opened (\S+)/)?.[1]), "proposal.md"), "utf8");
      assert.match(proposal, new RegExp(`Fix "login" \\$\\(touch .*PWNED\\) \`id\``), "the title arrived verbatim");
    }
  } finally {
    s.done();
  }
});

test("the guard reads every place an input carries a write", () => {
  const writes = [
    ["execute_sql", { sql: "CALL purge_users()" }], ["execute_sql", { sql: "COPY t FROM '/tmp/x'" }],
    ["execute_sql", { sql: "EXEC sp_delete" }], ["execute_sql", { sql: "SELECT * INTO backup FROM t" }],
    ["run_query", { q: "DELETE FROM t" }], ["run_query", { statements: ["DELETE FROM t"] }],
    ["run_query", { input: { sql: "DELETE FROM t" } }], ["jira_issue", { action: "delete" }],
    ["http_request", { method: "POST", url: "/x" }], ["graphql", { query: "mutation { deleteIssue(id: 1) }" }],
    ["CREATEISSUE", {}], ["getandremove", {}], ["upsertDocument", {}], ["linkIssues", {}], ["acknowledge", {}],
  ];
  for (const [name, input] of writes) assert.equal(isWriteCall(name, JSON.stringify(input)), true, `${name} ${JSON.stringify(input)} writes`);
  const reads = [
    ["execute_sql", { sql: "select * from t where a = 1" }], ["getJiraIssue", {}], ["searchJiraIssuesUsingJql", { jql: "project = X" }],
    ["run_query", { query: "avg:system.cpu{*}" }], ["get_logs", { query: "service:api status:error" }],
    ["graphql", { query: "query { issues { id } }" }], ["http_request", { method: "GET" }], ["getStartTime", {}],
    ["listTags", {}], ["getissue", {}], ["browser_click", {}], ["atlassianUserInfo", {}],
  ];
  for (const [name, input] of reads) assert.equal(isWriteCall(name, JSON.stringify(input)), false, `${name} ${JSON.stringify(input)} reads`);
});

test("a declared server no MCP configuration names is reported, at declaration and at validate", () => {
  const s = hostileWorkspace();
  try {
    mkdirSync(path.join(s.ws, ".cursor"), { recursive: true });
    writeFileSync(path.join(s.ws, ".cursor", "mcp.json"), JSON.stringify({ mcpServers: { "jira-cloud": { url: "x" } } }));
    const declared = s.run(s.ws, ["workspace", "tool", "jira"]).out;
    assert.match(declared, /no MCP configuration here names a server "atlassian" \(found: jira-cloud\)/);
    assert.match(s.run(s.ws, ["validate"]).out, /tool jira declares server "atlassian", which no MCP configuration here names \(jira-cloud\)/);
    writeFileSync(path.join(s.ws, ".cursor", "mcp.json"), JSON.stringify({ mcpServers: { Atlassian: { url: "x" } } }));
    assert.match(s.run(s.ws, ["validate"]).out, /names it "Atlassian" — the guard matches the exact key: `doctrina workspace tool jira --server Atlassian`/);
    writeFileSync(path.join(s.ws, ".cursor", "mcp.json"), JSON.stringify({ mcpServers: { atlassian: { url: "x" } } }));
    assert.doesNotMatch(s.run(s.ws, ["validate"]).out, /tool jira declares/);
  } finally {
    s.done();
  }
});

test("doctor and metrics answer at the workspace root, and a lost shadow is scaffolded again", () => {
  const s = hostileWorkspace();
  try {
    const doctor = s.run(s.ws, ["doctor"]);
    assert.equal(doctor.status, 0, doctor.out);
    assert.match(doctor.out, /Doctrina doctor — workspace "ws"/);
    assert.match(doctor.out, /cd "[^"]*my api" && doctrina doctor/);
    assert.doesNotMatch(doctor.out, /doctrina init/);
    assert.match(s.run(s.ws, ["metrics"]).out, /Deliveries {2}0 open · 0 closed[\s\S]*cd "[^"]*my api" && doctrina metrics/);

    rmSync(path.join(s.ws, "projects", "api"), { recursive: true, force: true });
    assert.match(s.run(s.ws, ["next"]).out, /api's shadow projects\/api\/ is gone[\s\S]*doctrina workspace attach api/);
    assert.match(s.run(s.ws, ["validate"]).out, /projects\/api\/ is gone — restore it from the workspace's git, or `doctrina workspace attach api` scaffolds it again/);
    assert.equal(s.run(s.ws, ["doctor"]).status, 1, "an error at the root fails the doctor");
    rmSync(path.join(s.api, ".doctrina"), { force: true });
    rmSync(path.join(s.api, "AGENTS.md"), { force: true });
    const inRepo = s.run(s.api, ["status"]);
    assert.match(inRepo.out, /shadowed "api" and its links are missing; never `doctrina init` here — link them again: cd .*ws && doctrina workspace attach api/);
    const attach = s.run(s.ws, ["workspace", "attach", "api"]);
    assert.equal(attach.status, 0, attach.out);
    assert.match(attach.out, /created shadow projects\/api\//);
    assert.equal(s.run(s.api, ["status"]).status, 0, "the repository reads its context again");
  } finally {
    s.done();
  }
});

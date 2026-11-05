// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE THIRD AUDIT CLOSES THE FAILURE PATHS (change 0234).
//
// The second audit walked the multi-repo flow when everything goes right.
// This one broke it on purpose: a change abandoned inside a delivery, a
// project routed out while it carries work, a repository that moved, a
// second clone of a shadowed repository, an executor opened inside the
// repository with a read-only tool declared, a change with no task
// written, and an agent reading `--json` when the command fails.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function workspace() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit3-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args, input = undefined) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env, input });
    return { status: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
  };
  for (const name of ["api", "web"]) {
    const dir = path.join(root, name);
    mkdirSync(dir);
    writeFileSync(path.join(dir, "package.json"), `{"name":"${name}"}`);
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", "add", "-A"], { cwd: dir });
    spawnSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", "commit", "-qm", "init"], { cwd: dir });
  }
  run(root, ["workspace", "init", "ws", "--no-git"]);
  const ws = path.join(root, "ws");
  run(ws, ["workspace", "add", "../api", "--role", "back"]);
  run(ws, ["workspace", "add", "../web", "--role", "front", "--depends-on", "api"]);
  const api = path.join(root, "api");
  const web = path.join(root, "web");
  run(api, ["spec", "new", "auth"]);
  run(web, ["spec", "new", "screens"]);
  run(ws, ["delivery", "new", "Login", "--projects", "api,web"]);
  return { root, ws, api, web, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

const changeIn = (/** @type {string} */ dir) =>
  String(readdirSync(path.join(dir, ".doctrina", "changes")).find((d) => /^\d{4}-/.test(d)));

test("the guard runs inside every shadow, and an in-repo project without it is named", () => {
  const s = workspace();
  try {
    s.run(s.ws, ["workspace", "tool", "jira"]);
    const hooks = JSON.parse(readFileSync(path.join(s.api, ".cursor", "hooks.json"), "utf8"));
    // With a tool declared the guard fails closed (change 0238).
    assert.deepEqual(hooks.hooks.beforeMCPExecution, [{ command: "doctrina workspace guard --hook cursor", failClosed: true }],
      "an executor opened in the repository reads this file, not the root's");
    assert.ok(hooks.hooks.sessionStart, "the session hook stays");
    const call = JSON.stringify({ tool_name: "createJiraIssue", mcp_server_name: "atlassian", tool_input: "{}" });
    assert.match(s.run(s.api, ["workspace", "guard", "--hook", "cursor"], call).stdout, /"permission":"deny"/);

    const lib = path.join(s.root, "lib");
    mkdirSync(path.join(lib, ".cursor"), { recursive: true });
    spawnSync("git", ["init", "-q"], { cwd: lib });
    s.run(lib, ["init", "--non-interactive", "--project-name", "lib", "--force"]);
    s.run(lib, ["spec", "new", "core"]);
    writeFileSync(path.join(lib, ".cursor", "hooks.json"), '{"version":1,"hooks":{}}\n');
    s.run(s.ws, ["workspace", "add", "../lib", "--role", "lib"]);
    assert.match(s.run(s.ws, ["validate"]).out, /project lib is in-repo and its \.cursor\/hooks\.json runs no `doctrina workspace guard`/);
  } finally {
    s.done();
  }
});

test("a change whose tasks are still the scaffold's is not handed out as cards", () => {
  const s = workspace();
  try {
    s.run(s.api, ["work", "Login API", "--capability", "auth", "--delivery", "1", "--quiet"]);
    const id = changeIn(s.api);
    const card = s.run(s.api, ["change", "card", id]).out;
    assert.match(card, /tasks\.md holds only the scaffold's placeholder boxes — write the tasks as cards first/);
    assert.doesNotMatch(card, /every task is ticked/, "nothing was ticked: nothing was written");
    const next = s.run(s.ws, ["next"]).out;
    assert.match(next, new RegExp(`api: ${id} still holds the scaffold's placeholder tasks[\\s\\S]*doctrina work --resume ${id}`));
    assert.doesNotMatch(next, /hand the next card/);
    assert.match(s.run(s.ws, ["delivery", "status", "1"]).out, /tasks not written yet \(placeholders\)/);
    assert.match(s.run(s.api, ["next"]).out, new RegExp(`doctrina work --resume ${id} — write the \\d+ open tasks`));
  } finally {
    s.done();
  }
});

test("a change abandoned inside a delivery stays on its record, and its number is never reused", () => {
  const s = workspace();
  try {
    s.run(s.api, ["work", "Login API", "--capability", "auth", "--delivery", "1", "--quiet"]);
    const id = changeIn(s.api);
    const out = s.run(s.api, ["change", "abandon", id, "--reason", "the login moves to web", "--force"]).out;
    assert.match(out, /it was this repository's part of delivery 0001-login/);
    const ledger = readFileSync(path.join(s.api, ".doctrina", "changes", "archive", "LEDGER.md"), "utf8");
    assert.match(ledger, new RegExp(`${id} — abandoned — the login moves to web \\(delivery 0001-login\\)`));

    assert.match(s.run(s.ws, ["delivery", "status", "1"]).out, new RegExp(`abandoned ${id}`));
    assert.match(s.run(s.ws, ["next"]).out, new RegExp(`api's change ${id} for 0001-login was abandoned \\(the login moves to web\\)[\\s\\S]*doctrina delivery route 0001-login web\\n`));
    assert.match(s.run(s.ws, ["delivery", "check", "1"]).out, new RegExp(`api: its change ${id} was abandoned`), "the delivery cannot close around it");
    assert.match(s.run(s.ws, ["handoff"]).out, new RegExp(`- api: ${id} abandoned \\(the login moves to web\\)`));

    s.run(s.api, ["work", "Login API again", "--capability", "auth", "--quiet"]);
    assert.notEqual(changeIn(s.api), id, "the ledger already names that id");
    assert.match(changeIn(s.api), /^0002-/);
  } finally {
    s.done();
  }
});

test("routing a project out while it carries the delivery's change is refused", () => {
  const s = workspace();
  try {
    s.run(s.web, ["work", "Login screen", "--capability", "screens", "--delivery", "1", "--quiet"]);
    const id = changeIn(s.web);
    const refused = s.run(s.ws, ["delivery", "route", "1", "api"]);
    assert.equal(refused.status, 3, refused.out);
    assert.match(refused.out, new RegExp(`web carries ${id} for 0001-login — routing it out would orphan the change`));
    assert.match(readFileSync(path.join(s.ws, "deliveries", "0001-login", "delivery.md"), "utf8"), /\*\*Projects:\*\* api, web/);

    const forced = s.run(s.ws, ["delivery", "route", "1", "api", "--force"]);
    assert.equal(forced.status, 0, forced.out);
    assert.match(forced.out, new RegExp(`web's ${id} still names 0001-login`));
    assert.match(s.run(s.ws, ["validate"]).out, new RegExp(`web's change ${id} names delivery 0001-login, which does not route web`));
    const back = s.run(s.ws, ["delivery", "route", "1", "api,web"]).out;
    assert.match(back, new RegExp(`web already carries ${id}`), "a project that has its change is not told to open one");
  } finally {
    s.done();
  }
});

test("a repository that moved is reported as moved, never cd'ed into", () => {
  const s = workspace();
  try {
    renameSync(s.web, path.join(s.root, "web-moved"));
    const status = s.run(s.ws, ["delivery", "status", "1"]).out;
    assert.match(status, /web .*\n {4}repository not at its path — doctrina workspace attach web --path <dir>/);
    assert.doesNotMatch(status, /cd [^\n]*\/web && doctrina work/);
    assert.match(s.run(s.ws, ["delivery", "check", "1"]).out, /web: the repository is not at .*`doctrina workspace attach web --path <dir>`/);
  } finally {
    s.done();
  }
});

test("a second clone of a shadowed repository is pointed at attach, never at init", () => {
  const s = workspace();
  try {
    const clone = path.join(s.root, "api-clone");
    spawnSync("git", ["clone", "-q", s.api, clone]);
    const next = s.run(clone, ["next"]).out;
    assert.match(next, /cd .*ws && doctrina workspace attach api --path .*api-clone — this repository is the workspace's shadowed "api"/);
    assert.doesNotMatch(next, /doctrina init —/);
    const status = s.run(clone, ["status"]);
    assert.equal(status.status, 3);
    assert.match(status.out, /hint: this repository is the workspace's shadowed "api"/);
    const init = s.run(clone, ["init", "--non-interactive"]);
    assert.equal(init.status, 3, init.out);
    assert.equal(existsSync(path.join(clone, ".doctrina")), false, "nothing planted in a repository that may not carry it");
  } finally {
    s.done();
  }
});

test("--json answers in JSON when the command fails, and delivery status builds a payload", () => {
  const s = workspace();
  try {
    const nowhere = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit3-nowhere-"));
    try {
      for (const cmd of ["status", "handoff"]) {
        const r = s.run(nowhere, [cmd, "--json"]);
        const payload = JSON.parse(r.stdout);
        assert.equal(payload.ok, false, cmd);
        assert.equal(payload.exit_code, 3, cmd);
        assert.match(payload.error, /not a Doctrina project/, cmd);
      }
    } finally {
      rmSync(nowhere, { recursive: true, force: true });
    }
    const unknown = JSON.parse(s.run(s.ws, ["delivery", "status", "99", "--json"]).stdout);
    assert.equal(unknown.ok, false);

    s.run(s.api, ["work", "Login API", "--capability", "auth", "--delivery", "1", "--quiet"]);
    const d = JSON.parse(s.run(s.ws, ["delivery", "status", "1", "--json"]).stdout);
    assert.equal(d.id, "0001-login");
    assert.deepEqual(d.projects, ["api", "web"]);
    assert.equal(d.rows[0].changes[0].id, changeIn(s.api));
    assert.ok(d.rows[0].changes[0].placeholders > 0);
    assert.equal(d.release.length, 2);
    assert.ok(d.blockers.some((/** @type {string} */ b) => /web: no change carries this delivery/.test(b)));
  } finally {
    s.done();
  }
});

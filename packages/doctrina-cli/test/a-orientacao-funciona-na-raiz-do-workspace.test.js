// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// ORIENTATION WORKS AT THE WORKSPACE ROOT (change 0230).
//
// The planner works at the workspace root. There, `next` told it to run
// `doctrina init` — which would create a project inside the workspace — and
// `handoff`, `status`, `validate` and `context` refused with "not a Doctrina
// project": the commands AGENTS.md says to reach for when unsure what comes
// next, and before compaction. And a session opened inside one of the
// repositories never learned that a delivery was open on it.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function workspace() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-ws-root-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
    return { status: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
  };
  const ws = path.join(root, "ws");
  for (const name of ["api", "web"]) {
    mkdirSync(path.join(root, name));
    spawnSync("git", ["init", "-q"], { cwd: path.join(root, name) });
  }
  run(root, ["workspace", "init", "ws", "--no-git"]);
  run(ws, ["workspace", "add", "../api", "--role", "back", "--about", "login API"]);
  run(ws, ["workspace", "add", "../web", "--role", "front", "--about", "login screen", "--depends-on", "api"]);
  return { root, ws, api: path.join(root, "api"), web: path.join(root, "web"), run, done: () => rmSync(root, { recursive: true, force: true }) };
}

const changeIn = (/** @type {string} */ repo) =>
  String(readdirSync(path.join(repo, ".doctrina", "changes")).find((d) => /^\d{4}-/.test(d)));

test("next at the workspace root walks the flow, and never says init", () => {
  const s = workspace();
  try {
    let next = s.run(s.ws, ["next"]).out;
    assert.doesNotMatch(next, /doctrina init/, "init would create a project inside the workspace");
    assert.match(next, /api has no specs yet .* absorb it/);
    assert.match(next, /cd .*api && doctrina intake --from-code/);

    s.run(s.api, ["spec", "new", "auth"]);
    s.run(s.web, ["spec", "new", "screens"]);
    assert.match(s.run(s.ws, ["next"]).out, /no delivery is open/);

    s.run(s.ws, ["delivery", "new", "Login", "--projects", "api,web"]);
    next = s.run(s.ws, ["next"]).out;
    assert.match(next, /api carries no change for 0001-login/);
    assert.match(next, /doctrina work "Login" --delivery 0001-login/);

    s.run(s.api, ["work", "Login API", "--capability", "auth", "--delivery", "1", "--quiet"]);
    const tasks = path.join(s.api, ".doctrina", "changes", changeIn(s.api), "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^- \[ \]\n(- \[ \]\n)*/m, "- [ ] Write the endpoint\n"));
    assert.match(s.run(s.ws, ["next"]).out, new RegExp(`api: ${changeIn(s.api)} has 1 task left[\\s\\S]*doctrina change card ${changeIn(s.api)}`));
    s.run(s.api, ["change", "tick", changeIn(s.api), "--all"]);
    assert.match(s.run(s.ws, ["next"]).out, new RegExp(`has every task ticked — review and close it[\\s\\S]*doctrina close ${changeIn(s.api)}`));

    const json = JSON.parse(s.run(s.ws, ["next", "--json"]).stdout);
    assert.ok(Array.isArray(json.data?.actions ?? json.actions), JSON.stringify(json).slice(0, 300));
  } finally {
    s.done();
  }
});

test("a delivery's record gaps point at the command that clears them", () => {
  const s = workspace();
  try {
    s.run(s.api, ["spec", "new", "auth"]);
    s.run(s.web, ["spec", "new", "screens"]);
    s.run(s.ws, ["delivery", "new", "Login", "--projects", "api"]);
    // The change is done and archived; only the delivery's own record is left.
    s.run(s.api, ["work", "Login API", "--capability", "auth", "--delivery", "1", "--quiet"]);
    const changes = path.join(s.api, ".doctrina", "changes");
    mkdirSync(path.join(changes, "archive"), { recursive: true });
    const id = changeIn(s.api);
    spawnSync(process.execPath, ["-e", `require("fs").renameSync(${JSON.stringify(path.join(changes, id))}, ${JSON.stringify(path.join(changes, "archive", `2026-11-04-${id}`))})`]);
    assert.match(s.run(s.ws, ["next"]).out, /copy the item's story and acceptance criteria, verbatim, under ## Story/);
    const file = path.join(s.ws, "deliveries", "0001-login", "delivery.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("## Story\n", "## Story\n\nAs a user I log in.\n"));
    assert.match(s.run(s.ws, ["next"]).out, /record the release evidence under ## Release and tick each claim[\s\S]*doctrina delivery tick 0001-login/);
    s.run(s.ws, ["delivery", "tick", "1", "--all"]);
    assert.match(s.run(s.ws, ["next"]).out, /record what was watched after the release under ## Observability/);
    writeFileSync(file, readFileSync(file, "utf8").replace("## Observability\n", "## Observability\n\n- error rate, 24h: flat\n"));
    assert.match(s.run(s.ws, ["next"]).out, /delivery 0001-login is ready to close[\s\S]*doctrina delivery close 0001-login/);
  } finally {
    s.done();
  }
});

test("handoff, status, validate and context answer at the workspace root", () => {
  const s = workspace();
  try {
    s.run(s.api, ["spec", "new", "auth"]);
    s.run(s.ws, ["delivery", "new", "Login lockout", "--ref", "SHOP-42", "--projects", "api"]);

    const hub = readFileSync(path.join(s.ws, "AGENTS.md"), "utf8");
    assert.match(hub, /Unsure what comes next: `doctrina next`\. Before a compaction or a handover:\n`doctrina handoff`/,
      "the hub the planner reads first names both");
    const handoff = s.run(s.ws, ["handoff"]);
    assert.equal(handoff.status, 0, handoff.out);
    assert.match(handoff.out, /# Doctrina workspace handoff/);
    assert.match(handoff.out, /\*\*api\*\* \(shadow, ready, back\)/);
    assert.match(handoff.out, /\*\*web\*\* \(shadow, pending, front\)/);
    assert.match(handoff.out, /### 0001-login-lockout — Login lockout \(SHOP-42\)/);
    assert.match(handoff.out, /- api: no change yet/);
    assert.match(handoff.out, /## Next actions\n\n1\. web has no specs yet/);

    const status = s.run(s.ws, ["status"]);
    assert.equal(status.status, 0, status.out);
    assert.match(status.out, /Projects {4}1\/2 ready · pending: web/);
    assert.match(status.out, /Deliveries {2}1 open · 0 closed/);
    const json = JSON.parse(s.run(s.ws, ["status", "--json"]).stdout);
    assert.equal((json.data ?? json).ready, 1);

    assert.equal(s.run(s.ws, ["validate"]).status, 0);
    const ctx = s.run(s.ws, ["context", "--for", "login API lockout"]);
    assert.equal(ctx.status, 0, ctx.out);
    assert.match(ctx.out, /The context pack is read inside a repository/);
    assert.match(ctx.out, /api\s+\d+ shared terms? \(.*login/);
    assert.match(ctx.out, /cd .*api && doctrina context <capability> --for "login API lockout" --concat/);
  } finally {
    s.done();
  }
});

test("validate at the workspace root finds a broken shadow and a delivery routed to no project", () => {
  const s = workspace();
  try {
    s.run(s.api, ["spec", "new", "auth"]);
    unlinkSync(path.join(s.api, "AGENTS.md"));
    s.run(s.ws, ["delivery", "new", "Login"]);
    const file = path.join(s.ws, "deliveries", "0001-login", "delivery.md");
    writeFileSync(file, readFileSync(file, "utf8").replace(/- \*\*Projects:\*\*.*/, "- **Projects:** api, mobile"));
    const r = s.run(s.ws, ["validate"]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /shadow api: 1 link missing from the repository — `doctrina workspace attach api`/);
    assert.match(r.out, /delivery 0001-login routes "mobile", which the workspace does not register/);
    s.run(s.ws, ["workspace", "attach", "api"]);
    writeFileSync(file, readFileSync(file, "utf8").replace("api, mobile", "api"));
    assert.equal(s.run(s.ws, ["validate"]).status, 0);
  } finally {
    s.done();
  }
});

test("prime inside a repository names its workspace and the delivery open on it", () => {
  const s = workspace();
  try {
    s.run(s.api, ["spec", "new", "auth"]);
    s.run(s.ws, ["delivery", "new", "Login", "--projects", "api"]);
    let prime = s.run(s.api, ["prime"]).out;
    assert.match(prime, /Workspace {2}\S+ \(.*ws\) — this repository is "api"/);
    assert.match(prime, /open delivery 0001-login — Login: no change here yet/);
    s.run(s.api, ["work", "Login API", "--capability", "auth", "--delivery", "1", "--quiet"]);
    prime = s.run(s.api, ["prime"]).out;
    assert.match(prime, new RegExp(`this project's change ${changeIn(s.api)} proposed`));
    assert.match(s.run(s.api, ["prime", "--hook", "claude"]).out, /open delivery 0001-login/);
  } finally {
    s.done();
  }
});

test("outside any workspace and project, next still names init", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-nowhere-"));
  try {
    const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(dir, "home") };
    delete env.DOCTRINA_WORKSPACE;
    const r = spawnSync(process.execPath, [cliEntry, "next"], { cwd: dir, encoding: "utf8", env });
    assert.match(r.stdout, /doctrina init/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

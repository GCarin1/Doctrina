// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { releaseBoxes, tickRelease } from "../src/lib/delivery.js";

// THE DELIVERY FLOW HAS NO HOLES (change 0226).
//
// An audit of the 0.20 flow, step by step, found six places where the
// planner had to leave the CLI or could go wrong in silence: ticking the
// Release claims by hand, routing to a project with no spec, reading a task
// card from the workspace root, a session in the repository not seeing the
// delivery its change belongs to, a change opened without --delivery that
// could not join one, and two deliveries writing in one repository at once.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function workspace() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-holes-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
    spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
  const ws = path.join(root, "ws");
  for (const name of ["api", "web"]) {
    mkdirSync(path.join(root, name));
    spawnSync("git", ["init", "-q"], { cwd: path.join(root, name) });
  }
  run(root, ["workspace", "init", "ws", "--no-git"]);
  run(ws, ["workspace", "add", "../api", "--role", "back"]);
  run(ws, ["workspace", "add", "../web", "--role", "front", "--depends-on", "api"]);
  const api = path.join(root, "api");
  const web = path.join(root, "web");
  return { root, ws, api, web, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("a project with no spec is not routed until it is absorbed, unless forced", () => {
  const s = workspace();
  try {
    const refused = s.run(s.ws, ["delivery", "new", "Login", "--projects", "api"]);
    assert.equal(refused.status, 3);
    assert.match(refused.stderr, /api is pending .* no spec to change/);
    assert.match(refused.stderr, /doctrina intake --from-code/);
    assert.deepEqual(readdirSync(path.join(s.ws, "deliveries")).filter((d) => /^\d{4}-/.test(d)), [], "nothing created");
    assert.equal(s.run(s.ws, ["delivery", "new", "Login"]).status, 0);
    assert.equal(s.run(s.ws, ["delivery", "route", "1", "api"]).status, 3);
    assert.equal(s.run(s.api, ["spec", "new", "auth"]).status, 0);
    assert.equal(s.run(s.ws, ["delivery", "route", "1", "api"]).status, 0, "ready once it has a spec");
    assert.equal(s.run(s.ws, ["delivery", "route", "1", "api,web", "--force"]).status, 0, "--force routes a pending one");
  } finally {
    s.done();
  }
});

test("the Release claims are listed and ticked through the CLI", () => {
  const s = workspace();
  try {
    s.run(s.ws, ["delivery", "new", "Login"]);
    const list = s.run(s.ws, ["delivery", "tick", "1"]);
    assert.equal(list.status, 0);
    assert.match(list.stdout, /1\. \[ \] Every project's change is merged/);
    assert.match(list.stdout, /2\. \[ \] The delivery was validated/);
    assert.equal(s.run(s.ws, ["delivery", "tick", "1", "9"]).status, 2);
    assert.match(s.run(s.ws, ["delivery", "tick", "1", "1"]).stdout, /ticked 1 Release box/);
    const file = readdirSync(path.join(s.ws, "deliveries")).find((d) => /^0001-/.test(d));
    const text = readFileSync(path.join(s.ws, "deliveries", String(file), "delivery.md"), "utf8");
    assert.match(text, /- \[x\] Every project's change is merged/);
    assert.match(text, /- \[ \] The delivery was validated/);
    assert.match(s.run(s.ws, ["delivery", "tick", "1", "--all"]).stdout, /ticked 1 Release box/);
    assert.doesNotMatch(s.run(s.ws, ["delivery", "check", "1"]).stdout, /## Release: unticked/);
  } finally {
    s.done();
  }
});

test("status names the card command per repository and a second writer in the same one", () => {
  const s = workspace();
  try {
    s.run(s.api, ["spec", "new", "auth"]);
    s.run(s.ws, ["delivery", "new", "Login", "--projects", "api"]);
    s.run(s.ws, ["delivery", "new", "Logout", "--projects", "api"]);
    s.run(s.api, ["work", "Login", "--delivery", "1", "--quiet", "--chore"]);
    s.run(s.api, ["work", "Logout", "--delivery", "2", "--quiet", "--chore", "--force"]);
    const changes = path.join(s.ws, "projects", "api", ".doctrina", "changes");
    const login = String(readdirSync(changes).find((d) => /login/.test(d)));
    writeFileSync(path.join(changes, login, "tasks.md"), "# Tasks\n\n- [ ] Lock after 3 attempts\n");
    const status = s.run(s.ws, ["delivery", "status", "1"]).stdout;
    assert.match(status, new RegExp(`next card: cd .*api && doctrina change card ${login}`));
    assert.match(status, /one writer per repository/);
    assert.match(status, /api: 0002-logout.* \(delivery 0002-logout\)/);
  } finally {
    s.done();
  }
});

test("a session in the repository sees the delivery its change belongs to", () => {
  const s = workspace();
  try {
    s.run(s.api, ["spec", "new", "auth"]);
    s.run(s.ws, ["delivery", "new", "Login", "--projects", "api"]);
    s.run(s.api, ["work", "Login", "--delivery", "1", "--quiet", "--chore"]);
    assert.match(s.run(s.api, ["prime"]).stdout, /delivery 0001-login/);
    assert.match(s.run(s.api, ["prime", "--pulse"]).stdout, /part of delivery 0001-login/);
  } finally {
    s.done();
  }
});

test("a change opened without --delivery joins one with --resume, and is never moved silently", () => {
  const s = workspace();
  try {
    s.run(s.api, ["spec", "new", "auth"]);
    s.run(s.ws, ["delivery", "new", "Login", "--projects", "api"]);
    s.run(s.ws, ["delivery", "new", "Other", "--projects", "api"]);
    s.run(s.api, ["work", "Lock the account", "--quiet", "--chore"]);
    const changes = path.join(s.ws, "projects", "api", ".doctrina", "changes");
    const id = String(readdirSync(changes).find((d) => /^0001-/.test(d)));
    const before = s.run(s.ws, ["delivery", "status", "1"]).stdout;
    assert.match(before, /no change yet/);
    assert.match(before, new RegExp(`api: ${id} \\(no delivery\\)`), "the stray change is named as a second writer");
    const joined = s.run(s.api, ["work", "--resume", id, "--delivery", "1"]);
    assert.equal(joined.status, 0, joined.stderr);
    assert.match(joined.stdout, new RegExp(`joined ${id} to delivery 0001-login`));
    assert.match(readFileSync(path.join(changes, id, "proposal.md"), "utf8"), /- \*\*Delivery:\*\* 0001-login/);
    assert.match(s.run(s.ws, ["delivery", "status", "1"]).stdout, new RegExp(`proposed\\s+${id}`));
    assert.equal(s.run(s.api, ["work", "--resume", id, "--delivery", "2"]).status, 3, "already in another delivery");
  } finally {
    s.done();
  }
});

test("release boxes ignore the section's comment and other sections", () => {
  const text = "## Story\n\n- [ ] not a release box\n\n## Release\n\n<!-- - [ ] example\n-->\n\n- [ ] A\n- [x] B\n\n## Observability\n";
  assert.deepEqual(releaseBoxes(text).map((b) => [b.ordinal, b.checked, b.text]), [[1, false, "A"], [2, true, "B"]]);
  assert.match(tickRelease(text, "all"), /- \[x\] A/);
  assert.match(tickRelease(text, "all"), /- \[ \] not a release box/);
});

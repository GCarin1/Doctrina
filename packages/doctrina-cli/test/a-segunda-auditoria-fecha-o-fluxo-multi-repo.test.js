// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { inventory, inventoryMarkdown, scriptLongRunning } from "../src/lib/code-inventory.js";
import { sliceSpec } from "../src/lib/context-slice.js";

// THE SECOND AUDIT CLOSES THE MULTI-REPO FLOW (change 0233).
//
// A workspace of four repositories — a shared front-end library, the web
// shop that imports it, the API and the mobile app — walked from the absorb
// to the delivery's close, every command run as its playbook prints it.
// Each test below is one place the walk went wrong.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function sandbox() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-audit2-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
    return { status: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
  };
  const repo = (/** @type {string} */ name, /** @type {Record<string, string>} */ files = {}) => {
    const dir = path.join(root, name);
    mkdirSync(dir, { recursive: true });
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), body);
    }
    spawnSync("git", ["init", "-q"], { cwd: dir });
    return dir;
  };
  return { root, run, repo, done: () => rmSync(root, { recursive: true, force: true }) };
}

const changeIn = (/** @type {string} */ dir) =>
  String(readdirSync(path.join(dir, ".doctrina", "changes")).find((d) => /^\d{4}-/.test(d)));

test("a script that watches is never seeded, and one told not to watch is", () => {
  for (const body of ["jest --watchAll", "ng test", "react-scripts test", "nodemon src/index.js", "tsc -w", "vitest --watch"]) {
    assert.equal(scriptLongRunning(body), true, `${body} keeps running`);
  }
  for (const body of ["jest", "vitest run", "vitest --watch=false", "jest --watchAll=false", "ng test --watch=false",
    "ng test --no-watch", "CI=true react-scripts test", "karma start --single-run", "tsc -p ."]) {
    assert.equal(scriptLongRunning(body), false, `${body} returns`);
  }
});

test("the inventory claims no README it did not find, and counts in the singular", () => {
  const s = sandbox();
  try {
    const dir = s.repo("api", { "src/routes/login.js": "export {}\n", "package.json": '{"name":"api","scripts":{"test":"jest --watchAll"}}' });
    spawnSync("git", ["-c", "user.email=a@b", "-c", "user.name=a", "commit", "-qm", "init", "--allow-empty"], { cwd: dir });
    const md = inventoryMarkdown(inventory(dir), "api");
    assert.match(md, /- none found — the repository has no README either/);
    assert.doesNotMatch(md, /beyond the root README/);
    assert.match(md, /- History: 1 commit, /);
    assert.match(md, /- `src\/` — 1 file\n/);
    const seeded = md.split("Seeded into `doctrina verify --init`")[1]?.split("\n\n")[0] ?? "";
    assert.doesNotMatch(seeded, /jest --watchAll/, "a watching test script is not seeded");
    assert.match(md, /`npm run test` — long-running or interactive, from package.json scripts \(jest --watchAll\)/, "it is listed, with why");
  } finally {
    s.done();
  }
});

test("a bare intake reprints the ABSORB playbook for a stored inventory, and the workspace says so", () => {
  const s = sandbox();
  try {
    const api = s.repo("api", { "package.json": '{"name":"api"}', "src/index.js": "\n" });
    s.run(s.root, ["workspace", "init", "ws", "--no-git"]);
    const ws = path.join(s.root, "ws");
    s.run(ws, ["workspace", "add", "../api", "--role", "back"]);
    const first = s.run(api, ["intake", "--from-code"]);
    assert.match(first.out, /^10\. This project belongs to the workspace/m, "the workspace step follows step 9");
    assert.match(first.out, /created \.doctrina\/intake\.md — \d+ files? read: .*; 0 test files; \d+ candidate areas?/);

    const again = s.run(api, ["intake"]);
    assert.equal(again.status, 0, again.out);
    assert.match(again.out, /^Absorb playbook/m, "the inventory is read by the absorb, never as the product's intent");
    assert.doesNotMatch(again.out, /^Bootstrap playbook/m);

    const next = s.run(ws, ["next"]).out;
    assert.match(next, /api's absorb is under way \(intake not converted\)/);
    assert.match(next, /cd .*api && doctrina intake\n/, "--from-code refuses once the inventory is stored");
    assert.doesNotMatch(next, /--from-code/);
  } finally {
    s.done();
  }
});

test("a scaffolded spec is sliced without its template comments", () => {
  const s = sandbox();
  try {
    const dir = s.repo("api");
    s.run(dir, ["init", "--non-interactive", "--project-name", "Api"]);
    s.run(dir, ["spec", "new", "auth"]);
    const file = path.join(dir, ".doctrina", "specs", "auth", "spec.md");
    const text = readFileSync(file, "utf8").replace("### Event-driven\n\n-", "### Event-driven\n\n- When a POST arrives at /login, the system shall check the password.");
    const slice = sliceSpec(text, ["password"], ".doctrina/specs/auth/spec.md");
    assert.ok(slice, "the requirement matches");
    assert.equal(slice.total, 2, "one requirement and the placeholder criterion — never the five EARS forms in the comment");
    assert.doesNotMatch(slice.text, /<!--|Ubiquitous: +The system shall <action>/);
    assert.doesNotMatch(slice.text, /… 5 not matching/);
  } finally {
    s.done();
  }
});

function lockoutWorkspace() {
  const s = sandbox();
  const api = s.repo("api", { "package.json": '{"name":"@acme/api"}' });
  const web = s.repo("web", { "package.json": '{"name":"shop-web","dependencies":{"@acme/api":"^1.0.0"}}' });
  s.run(s.root, ["workspace", "init", "ws", "--no-git"]);
  const ws = path.join(s.root, "ws");
  s.run(ws, ["workspace", "add", "../api", "--role", "back"]);
  s.run(ws, ["workspace", "add", "../web", "--role", "front"]);
  s.run(api, ["spec", "new", "auth"]);
  const spec = path.join(api, ".doctrina", "specs", "auth", "spec.md");
  writeFileSync(spec, readFileSync(spec, "utf8").replace("### Event-driven\n\n-",
    "### Event-driven\n\n- When a POST arrives at /login, the system shall route it to the login handler.\n- When a cart is paid, the system shall send the receipt."));
  s.run(web, ["spec", "new", "screens"]);
  s.run(ws, ["delivery", "new", "Bloqueio de conta", "--projects", "api"]);
  const file = path.join(ws, "deliveries", "0001-bloqueio-de-conta", "delivery.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("## Story\n", "## Story\n\nComo cliente quero a conta bloqueada após 3 senhas erradas no login.\n"));
  return { ...s, ws, api, web };
}

test("work --delivery ranks the capabilities by the delivery's story too", () => {
  const s = lockoutWorkspace();
  try {
    const out = s.run(s.api, ["work", "Bloqueio de conta", "--delivery", "1"]).out;
    assert.doesNotMatch(out, /No existing spec matches the prompt/, out.slice(0, 800));
    assert.match(out, /\bauth\b/);
  } finally {
    s.done();
  }
});

test("the card keeps the requirement the change touches, and no template comment", () => {
  const s = lockoutWorkspace();
  try {
    s.run(s.api, ["work", "Bloqueio de conta", "--title", "lockout", "--capability", "auth", "--delivery", "1", "--quiet"]);
    const id = changeIn(s.api);
    s.run(s.api, ["change", "delta", id, "auth", "--requirement", "event: When a third wrong password arrives at /login, the system shall answer 423."]);
    const tasks = path.join(s.api, ".doctrina", "changes", id, "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^- \[ \]\n(- \[ \]\n)*/m, "- [ ] Count wrong passwords and lock on the third\n"));
    const card = s.run(s.api, ["change", "card", id]).out;
    assert.match(card, /- When a POST arrives at \/login, the system shall route it to the login handler\./,
      "the delta says /login; the task alone never did");
    assert.doesNotMatch(card, /send the receipt/);
    assert.doesNotMatch(card, /<!--/);
  } finally {
    s.done();
  }
});

test("next inside a repository points at the delivery routed to it", () => {
  const s = lockoutWorkspace();
  try {
    assert.match(s.run(s.api, ["next"]).out, /doctrina work "Bloqueio de conta" --delivery 0001-bloqueio-de-conta — delivery 0001-bloqueio-de-conta is routed to this repository and has no change here yet/);
    s.run(s.api, ["work", "Bloqueio de conta", "--title", "lockout", "--capability", "auth", "--delivery", "1", "--quiet"]);
    const id = changeIn(s.api);
    const changes = path.join(s.api, ".doctrina", "changes");
    mkdirSync(path.join(changes, "archive"), { recursive: true });
    renameSync(path.join(changes, id), path.join(changes, "archive", `2026-11-04-${id}`));
    const next = s.run(s.api, ["next"]).out;
    assert.match(next, /cd .*ws && doctrina next — this repository's part of delivery 0001-bloqueio-de-conta is closed; the delivery goes on at the workspace/);
  } finally {
    s.done();
  }
});

test("validate at the root warns on a dependency the manifests declare and the registry does not", () => {
  const s = lockoutWorkspace();
  try {
    const before = s.run(s.ws, ["validate"]);
    assert.match(before.out, /project web's package\.json depends on @acme\/api, which is api — declare it so routing orders them: `doctrina workspace attach web --depends-on api`/);
    const set = s.run(s.ws, ["workspace", "attach", "web", "--depends-on", "api"]);
    assert.equal(set.status, 0, set.out);
    assert.match(set.out, /depends on web → api/);
    assert.deepEqual(JSON.parse(readFileSync(path.join(s.ws, "workspace.json"), "utf8")).projects.find((p) => p.name === "web").dependsOn, ["api"]);
    assert.doesNotMatch(s.run(s.ws, ["validate"]).out, /depends on @acme\/api/);
    assert.equal(s.run(s.ws, ["workspace", "attach", "web", "--depends-on", "mobile"]).status, 2, "an unregistered name is a usage error");
  } finally {
    s.done();
  }
});

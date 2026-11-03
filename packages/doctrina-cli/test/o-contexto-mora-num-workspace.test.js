// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { EXCLUDE_BEGIN, EXCLUDE_END, withExcludeBlock } from "../src/lib/workspace.js";

// THE CONTEXT LIVES IN A WORKSPACE (change 0220, ADR 0029).
//
// A delivery crosses several repositories, and not every repository may
// carry .doctrina/. The workspace registers each one; a repository without
// its own artifacts is SHADOWED: the artifacts live in the workspace (a
// private git repository) and are linked in, invisible to the repository's
// git. Every existing command keeps working inside the repository.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function sandbox() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-ws-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
    spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
  const git = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
    spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" });
  // A repository with no .doctrina/ and a .cursor/hooks.json of its own.
  const front = path.join(root, "front-core");
  mkdirSync(path.join(front, ".cursor"), { recursive: true });
  writeFileSync(path.join(front, "package.json"), "{}\n");
  writeFileSync(path.join(front, ".cursor", "hooks.json"), '{"version":1,"hooks":{}}\n');
  git(front, ["init", "-q"]);
  git(front, ["add", "."]);
  git(front, ["commit", "-qm", "init"]);
  // A repository that carries its own .doctrina/.
  const back = path.join(root, "back-end");
  mkdirSync(back);
  git(back, ["init", "-q"]);
  assert.equal(run(back, ["init", "--non-interactive", "--project-name", "back-end", "--project-description", "API"]).status, 0);
  const ws = path.join(root, "ws");
  return { root, env, run, git, front, back, ws, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("workspace init creates the versioned workspace and refuses a second init", () => {
  const s = sandbox();
  try {
    const r = s.run(s.root, ["workspace", "init", "ws", "--name", "acme"]);
    assert.equal(r.status, 0, r.stderr);
    for (const p of ["workspace.json", "projects", "deliveries", ".git"]) assert.ok(existsSync(path.join(s.ws, p)), p);
    const doc = JSON.parse(readFileSync(path.join(s.ws, "workspace.json"), "utf8"));
    assert.equal(doc.name, "acme");
    assert.deepEqual(doc.projects, []);
    // Real paths on both sides: macOS hands out /var/... for /private/var/...
    assert.equal(realpathSync(readFileSync(path.join(s.root, "home", "workspace"), "utf8").trim()), realpathSync(s.ws));
    assert.equal(s.run(s.root, ["workspace", "init", "ws"]).status, 3);
    // Outside any workspace, the subcommands name the remedy.
    const lost = s.run(s.back, ["workspace", "list"]);
    assert.equal(lost.status, 3);
    assert.match(lost.stderr, /doctrina workspace init/);
  } finally {
    s.done();
  }
});

test("a repository with .doctrina/ is in-repo; one without is a shadow the cycle runs through", () => {
  const s = sandbox();
  try {
    s.run(s.root, ["workspace", "init", "ws"]);
    assert.equal(s.run(s.ws, ["workspace", "add", "../back-end", "--role", "back"]).status, 0);
    const add = s.run(s.ws, ["workspace", "add", "../front-core", "--role", "front", "--depends-on", "back-end"]);
    assert.equal(add.status, 0, add.stderr);
    const doc = JSON.parse(readFileSync(path.join(s.ws, "workspace.json"), "utf8"));
    assert.deepEqual(doc.projects.map((p) => [p.name, p.mode]), [["back-end", "in-repo"], ["front-core", "shadow"]]);
    assert.deepEqual(doc.projects[1].dependsOn, ["back-end"]);
    const shadow = path.join(s.ws, "projects", "front-core");
    assert.ok(existsSync(path.join(shadow, ".doctrina", "index.json")));
    assert.ok(lstatSync(path.join(s.front, ".doctrina")).isSymbolicLink());
    // The cycle, run in the repository, writes into the workspace.
    const work = s.run(s.front, ["work", "Criar tela de login", "--quiet"]);
    assert.equal(work.status, 0, work.stderr);
    assert.ok(readdirSync(path.join(shadow, ".doctrina", "changes")).some((d) => /tela-login/.test(d)));
    // Refusals: a path registered twice, a name taken, an unknown dependency.
    assert.equal(s.run(s.ws, ["workspace", "add", "../front-core", "--name", "other"]).status, 3);
    assert.equal(s.run(s.ws, ["workspace", "add", "../back-end"]).status, 3);
    mkdirSync(path.join(s.root, "app"));
    assert.equal(s.run(s.ws, ["workspace", "add", "../app", "--depends-on", "nope"]).status, 2);
  } finally {
    s.done();
  }
});

test("attach hides the shadow from the repository's git and keeps what the repository owns", () => {
  const s = sandbox();
  try {
    s.run(s.root, ["workspace", "init", "ws"]);
    const add = s.run(s.ws, ["workspace", "add", "../front-core"]);
    assert.match(add.stdout, /kept\s+\.cursor\/hooks\.json/);
    assert.equal(readFileSync(path.join(s.front, ".cursor", "hooks.json"), "utf8"), '{"version":1,"hooks":{}}\n');
    assert.equal(s.git(s.front, ["status", "--porcelain"]).stdout, "", "nothing new for the repository's git");
    const exclude = readFileSync(path.join(s.front, ".git", "info", "exclude"), "utf8");
    assert.match(exclude, /\/\.doctrina\n/);
    assert.match(exclude, /\/AGENTS\.md\n/);
    assert.doesNotMatch(exclude, /hooks\.json/, "a kept path is not hidden");
    // A second attach replaces the block instead of appending another.
    assert.equal(s.run(s.ws, ["workspace", "attach", "front-core"]).status, 0);
    const again = readFileSync(path.join(s.front, ".git", "info", "exclude"), "utf8");
    assert.equal(again.split(EXCLUDE_BEGIN).length, 2);
  } finally {
    s.done();
  }
});

test("detach removes the links and the block, and the shadow stays", () => {
  const s = sandbox();
  try {
    s.run(s.root, ["workspace", "init", "ws"]);
    s.run(s.ws, ["workspace", "add", "../front-core"]);
    const r = s.run(s.ws, ["workspace", "detach", "front-core"]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!existsSync(path.join(s.front, ".doctrina")));
    assert.ok(!existsSync(path.join(s.front, "AGENTS.md")));
    assert.ok(existsSync(path.join(s.front, ".cursor", "hooks.json")), "the repository's own file survives");
    assert.doesNotMatch(readFileSync(path.join(s.front, ".git", "info", "exclude"), "utf8"), /doctrina:workspace/);
    assert.ok(existsSync(path.join(s.ws, "projects", "front-core", ".doctrina", "index.json")), "the shadow is intact");
  } finally {
    s.done();
  }
});

test("workspace list reports state and points a pending project at absorb", () => {
  const s = sandbox();
  try {
    s.run(s.root, ["workspace", "init", "ws"]);
    s.run(s.ws, ["workspace", "add", "../front-core", "--about", "design system"]);
    const r = s.run(s.ws, ["workspace", "list"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /front-core\s+shadow\s+pending/);
    assert.match(r.stdout, /design system/);
    assert.match(r.stdout, /doctrina intake --from-code/);
    // From inside the shadowed repository, the link finds the workspace.
    assert.match(s.run(s.front, ["workspace", "list"]).stdout, /front-core/);
  } finally {
    s.done();
  }
});

test("the exclude block is replaced in place and the text around it survives", () => {
  const before = "# mine\n*.tmp\n";
  const once = withExcludeBlock(before, ["/.doctrina"]);
  assert.equal(once, `# mine\n*.tmp\n\n${EXCLUDE_BEGIN}\n/.doctrina\n${EXCLUDE_END}\n`);
  const twice = withExcludeBlock(once, ["/.doctrina", "/AGENTS.md"]);
  assert.equal(twice.split(EXCLUDE_BEGIN).length, 2);
  assert.match(twice, /\/AGENTS\.md/);
  assert.equal(withExcludeBlock(twice, []), before);
});

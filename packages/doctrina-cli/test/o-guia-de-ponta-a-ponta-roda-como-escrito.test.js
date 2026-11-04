// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE END-TO-END GUIDE RUNS AS WRITTEN (change 0228).
//
// docs/en/end-to-end-flow.md is the flow a team follows across
// repositories: Phase 0 once, Phase 1 per item of work. Walking it by hand
// against the CLI found two places where it did not hold — the executor
// model edited into workspace.json never reached the subagent, and the
// absorb's `verify --init` ignored the commands the inventory had just
// found — so the walk is kept as a test. Each step below names the guide's
// step it follows; what an agent would write (a spec, a delta's prose, the
// code) is written here by hand, and every gate runs for real, `close`
// included.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function setup() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-guide-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const ok = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = run(cwd, args);
    assert.equal(r.status, 0, `doctrina ${args.join(" ")}\n${r.out}`);
    return r.out;
  };
  const git = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
    spawnSync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" });
  for (const repo of ["api", "web"]) {
    const dir = path.join(root, repo);
    mkdirSync(dir);
    git(dir, ["init", "-q"]);
    writeFileSync(path.join(dir, "index.js"), "export const ready = true;\n");
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: repo, type: "module", scripts: { test: "node -e 0", start: "node ." } }));
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-qm", "init"]);
  }
  return { root, ws: path.join(root, "ws"), api: path.join(root, "api"), web: path.join(root, "web"), run, ok, git };
}

/** What the absorb playbook asks the agent to write: a baseline spec. */
function baselineSpec(/** @type {string} */ cap) {
  return `# Spec — ${cap}

**Capability:** ${cap}
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — test fixture
**Source:** \`*.js\`, \`package.json\`, \`test/**\`
**Last updated:** 2026-11-04
**Version:** 0.1.0

## Purpose

The ${cap} surface of the fixture.

## Requirements (EARS)

### Ubiquitous

- The system shall export its entry point from \`index.js\`.

## Acceptance criteria

1. [unverified] The entry point loads — verified by \`index.js\`.

## Out of scope for this spec

- Everything else.
`;
}

/** Steps 5–8 in one repository: delta, a card, the code, the close. */
function deliverIn(s, /** @type {string} */ repo, /** @type {string} */ cap, /** @type {string} */ file) {
  const dir = path.join(s.root, repo);
  s.ok(dir, ["work", `Login on ${repo}`, "--title", `login ${repo}`, "--capability", cap, "--delivery", "1", "--quiet"]);
  const id = readdirSync(path.join(dir, ".doctrina", "changes")).find((d) => /^\d{4}-/.test(d));
  assert.ok(id, `a change opened in ${repo}`);
  const change = path.join(dir, ".doctrina", "changes", String(id));
  assert.match(readFileSync(path.join(change, "proposal.md"), "utf8"), /- \*\*Delivery:\*\* 0001-login/);
  s.ok(dir, ["change", "delta", String(id), cap,
    "--requirement", `event: When a login is attempted on ${repo}, the system shall answer it.`,
    "--criterion", `[verified] a login is answered — verified by \`test/${file}.test.js\`.`,
    "--bump", "minor"]);
  const tasks = path.join(change, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^- \[ \]\n(- \[ \]\n)*/m,
    `- [ ] Answer a login attempt\n  - Files: ${file}.js, test/${file}.test.js\n  - Verify: node test/${file}.test.js\n`));
  const proposal = path.join(change, "proposal.md");
  writeFileSync(proposal, readFileSync(proposal, "utf8")
    .replace("<!-- The shape of the change: artifacts created or modified, specs affected. -->", `\`${file}.js\` and its test.`)
    .replace("<!-- Anything adjacent that this change deliberately does NOT touch. -->", "Nothing else.")
    .replace("<!-- List unresolved decisions. Empty if none. -->", "None."));
  // Step 6: the executor reads its card from inside the repository.
  const card = s.ok(dir, ["change", "card", String(id)]);
  assert.match(card, /delivery 0001-login/);
  assert.match(card, new RegExp(`Files: ${file}\\.js`));
  mkdirSync(path.join(dir, "test"), { recursive: true });
  writeFileSync(path.join(dir, `${file}.js`), "export const answer = (password) => password === \"ok\";\n");
  writeFileSync(path.join(dir, "test", `${file}.test.js`), `import { answer } from "../${file}.js";\nif (answer("bad")) process.exit(1);\n`);
  s.ok(dir, ["change", "tick", String(id), "--all"]);
  // Step 7: review and verify.
  assert.match(s.ok(dir, ["review", "--change", String(id)]), /no structural conformance breaks/);
  s.ok(dir, ["verify"]);
  // Step 8: the planner closes the change — every gate, for real.
  const closed = s.ok(dir, ["close", String(id)]);
  assert.match(closed, /closed — verified, archived and validated/);
}

test("the end-to-end flow runs as the guide writes it, from an empty workspace to a closed delivery", () => {
  const s = setup();
  try {
    // Phase 0.1–0.2: create the workspace and register each repository.
    s.ok(s.root, ["workspace", "init", "ws"]);
    s.ok(s.ws, ["workspace", "add", "../api", "--role", "back", "--about", "REST API"]);
    s.ok(s.ws, ["workspace", "add", "../web", "--role", "front", "--about", "Web app", "--depends-on", "api"]);
    assert.match(s.ok(s.ws, ["workspace", "list"]), /api\s+shadow\s+pending/);
    // Phase 1.4 before 0.3: a pending repository cannot be routed to.
    s.ok(s.ws, ["delivery", "new", "Login", "--ref", "ITEM-1"]);
    assert.equal(s.run(s.ws, ["delivery", "route", "1", "web,api"]).status, 3);

    // Phase 0.3: absorb each repository from its code.
    for (const [repo, cap] of [["api", "auth"], ["web", "login"]]) {
      const dir = path.join(s.root, repo);
      s.ok(dir, ["intake", "--from-code"]);
      s.ok(dir, ["spec", "new", cap]);
      writeFileSync(path.join(dir, ".doctrina", "specs", cap, "spec.md"), baselineSpec(cap));
      s.ok(dir, ["index", "rebuild"]);
      assert.match(s.ok(dir, ["verify", "--init"]), /seeded from the code inventory: npm run test/,
        "the build gate starts from the commands the inventory found");
      // The fixture's own runner, so the test needs no package manager.
      writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({ checks: [{ name: "test", run: `node test/${repo === "api" ? "lockout" : "form"}.test.js` }] }));
      s.ok(dir, ["intake", "--converted"]);
    }
    // Phase 0.4: declare a tool by its server — no preset needed.
    s.ok(s.ws, ["workspace", "tool", "tracker", "--server", "tracker-mcp", "--for", "planner", "--purpose", "read the work items"]);
    // Phase 0.5: the executor model, applied by `workspace list`.
    const wsJson = path.join(s.ws, "workspace.json");
    const doc = JSON.parse(readFileSync(wsJson, "utf8"));
    doc.agents = { executor: { model: "small-model" } };
    writeFileSync(wsJson, JSON.stringify(doc, null, 2) + "\n");
    const listed = s.ok(s.ws, ["workspace", "list"]);
    assert.match(listed, /api\s+shadow\s+ready/);
    assert.match(readFileSync(path.join(s.ws, ".claude", "agents", "doctrina-executor.md"), "utf8"), /model: small-model/);
    assert.match(readFileSync(path.join(s.ws, "AGENTS.md"), "utf8"), /\| api \| shadow \| ready \|/);
    // Phase 0.6: the multi-root workspace file.
    assert.ok(readdirSync(s.ws).includes("ws.code-workspace"));

    // Phase 1.2: the story, verbatim, and its sources.
    const deliveryFile = path.join(s.ws, "deliveries", "0001-login", "delivery.md");
    writeFileSync(deliveryFile, readFileSync(deliveryFile, "utf8")
      .replace("## Story\n", "## Story\n\nAs a user I log in with my password.\n- AC1: a wrong password is refused\n")
      .replace("## Sources\n", "## Sources\n\n- tracker ITEM-1 — the story\n"));
    // Phase 1.4: route, dependencies first.
    assert.match(s.ok(s.ws, ["delivery", "route", "1", "web,api"]), /api → web/);
    // Phase 1.5–1.8, one repository at a time.
    deliverIn(s, "api", "auth", "lockout");
    const status = s.ok(s.ws, ["delivery", "status", "1"]);
    assert.match(status, /archived\s+0001-/);
    assert.match(status, /web: no change yet|web[\s\S]*no change/);
    deliverIn(s, "web", "login", "form");

    // Phase 1.9: the release claims, listed and ticked through the CLI.
    assert.match(s.ok(s.ws, ["delivery", "tick", "1"]), /2 of 2 unticked/);
    s.ok(s.ws, ["delivery", "tick", "1", "--all"]);
    // Phase 1.10: what was watched after the release.
    assert.equal(s.run(s.ws, ["delivery", "check", "1"]).status, 1, "Observability is still empty");
    writeFileSync(deliveryFile, readFileSync(deliveryFile, "utf8")
      .replace("## Observability\n", "## Observability\n\n- login error rate, 24h after the release: no new errors\n"));
    // Phase 1.11: check, close, and the workspace is what gets committed.
    assert.match(s.ok(s.ws, ["delivery", "check", "1"]), /ready to close/);
    assert.match(s.ok(s.ws, ["delivery", "close", "1"]), /Tell the human: delivery 0001-login is closed — 2 projects \(api, web\)/);
    assert.match(s.ok(s.ws, ["delivery", "list"]), /0001-login\s+closed\s+ITEM-1\s+api, web\s+2\/2 changes closed/);
    for (const repo of ["api", "web"]) {
      const shadowArchive = path.join(s.ws, "projects", repo, ".doctrina", "changes", "archive");
      assert.ok(readdirSync(shadowArchive).some((d) => /0001-login/.test(d)), `${repo}'s archived change lives in the workspace`);
      assert.doesNotMatch(s.git(path.join(s.root, repo), ["status", "--porcelain"]).stdout, /\.doctrina|AGENTS\.md/,
        `${repo}'s git never sees the shadow`);
    }
  } finally {
    rmSync(s.root, { recursive: true, force: true });
  }
});

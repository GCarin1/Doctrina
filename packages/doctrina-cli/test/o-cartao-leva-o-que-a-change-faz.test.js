// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// THE CARD CARRIES WHAT THE CHANGE DOES (change 0231).
//
// A task card is the executor's whole context (ADR 0030). It cut the spec AS
// IT STANDS to the task — the truth before apply — so the requirement the
// executor was there to implement lived only in the delta, and reached the
// card only if the planner copied it by hand. The acceptance criteria of the
// story lived in the workspace's delivery file, where an executor opened in
// the repository never looks, and the decisions that bind the capability
// were not named at all.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function setup() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-card-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const ws = path.join(root, "ws");
  const api = path.join(root, "api");
  mkdirSync(api);
  spawnSync("git", ["init", "-q"], { cwd: api });
  run(root, ["workspace", "init", "ws", "--no-git"]);
  run(ws, ["workspace", "add", "../api", "--role", "back"]);
  run(api, ["spec", "new", "auth"]);
  run(ws, ["delivery", "new", "Lockout", "--projects", "api"]);
  const file = path.join(ws, "deliveries", "0001-lockout", "delivery.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("## Story\n",
    "## Story\n\nAs a customer I want my account locked after 3 wrong passwords.\n- AC1: the 3rd wrong password answers 423 ACCOUNT_LOCKED\n"));
  run(api, ["work", "Lock the account", "--title", "lockout", "--capability", "auth", "--delivery", "1", "--quiet"]);
  const id = String(readdirSync(path.join(api, ".doctrina", "changes")).find((d) => /^\d{4}-/.test(d)));
  run(api, ["change", "delta", id, "auth",
    "--requirement", "event: When a third wrong password in a row arrives, the system shall answer 423 with ACCOUNT_LOCKED.",
    "--criterion", "[unverified] the third wrong password is refused with 423 — verified by `test/lockout.test.js`."]);
  const tasks = path.join(api, ".doctrina", "changes", id, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^- \[ \]\n(- \[ \]\n)*/m, "- [ ] Lock the account on the third wrong password\n  - Files: src/login.js\n"));
  return { root, ws, api, id, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("the card carries the requirement the change adds, verbatim", () => {
  const s = setup();
  try {
    const card = s.run(s.api, ["change", "card", s.id]);
    assert.equal(card.status, 0, card.out);
    assert.match(card.out, /## What this change does to the spec\n\n- auth adds an event requirement: When a third wrong password in a row arrives, the system shall answer 423 with ACCOUNT_LOCKED\./);
    assert.match(card.out, /- auth adds the criterion: \[unverified\] the third wrong password is refused with 423/);
    assert.match(card.out, /## Spec — auth as it stands \(whole: nothing in it matched the task\)\n\n# Spec — auth/,
      "a spec nothing matched comes whole, never dropped");
  } finally {
    s.done();
  }
});

test("the card carries the delivery's story when the change belongs to one", () => {
  const s = setup();
  try {
    const card = s.run(s.api, ["change", "card", s.id]).out;
    assert.match(card, /## The story \(delivery 0001-lockout\)\n\nAs a customer I want my account locked after 3 wrong passwords\.\n- AC1: the 3rd wrong password answers 423 ACCOUNT_LOCKED/);
  } finally {
    s.done();
  }
});

test("the card names the accepted decisions that bind the capability, scoped or citing it", () => {
  const s = setup();
  try {
    const decisions = path.join(s.api, ".doctrina", "decisions");
    mkdirSync(decisions, { recursive: true });
    const adr = (/** @type {string} */ n, /** @type {string} */ title, /** @type {string} */ headers, /** @type {string} */ body) =>
      writeFileSync(path.join(decisions, `${n}-${title.toLowerCase().replace(/\W+/g, "-")}.md`),
        `# ADR ${n} — ${title}\n\n- **Status:** accepted\n- **Date:** 2026-11-04\n${headers}\n## Decision\n\n${body}\n`);
    adr("0001", "Passwords are hashed with argon2", "- **Scope:** auth\n", "Use argon2.");
    adr("0002", "Logs never carry a secret", "", "No secret in any log, auth included.");
    adr("0003", "Billing rounds half-even", "- **Scope:** billing\n", "Half-even, mentions auth only in passing.");
    s.run(s.api, ["index", "rebuild"]);
    const card = s.run(s.api, ["change", "card", s.id]).out;
    assert.match(card, /## Decisions that bind it\n\n- ADR 0001 — Passwords are hashed with argon2 \(`doctrina show 0001`\)/);
    assert.match(card, /- ADR 0002 — Logs never carry a secret/, "an unscoped decision that cites the capability");
    assert.doesNotMatch(card, /ADR 0003/, "a decision scoped to another capability does not bind this one");
  } finally {
    s.done();
  }
});

test("a change outside any delivery and decision gets the card it had", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-card-plain-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  try {
    run(["init", "--non-interactive", "--project-name", "Acme"]);
    run(["spec", "new", "auth"]);
    run(["work", "Tidy", "--title", "tidy", "--chore", "--quiet"]);
    const id = String(readdirSync(path.join(dir, ".doctrina", "changes")).find((d) => /^\d{4}-/.test(d)));
    const tasks = path.join(dir, ".doctrina", "changes", id, "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^- \[ \]\n(- \[ \]\n)*/m, "- [ ] Rename a file\n"));
    const card = run(["change", "card", id]).stdout;
    assert.match(card, /# Task card/);
    assert.doesNotMatch(card, /## The story|## What this change does|## Decisions that bind it/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

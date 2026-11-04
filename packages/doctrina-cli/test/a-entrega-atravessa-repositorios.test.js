// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { taskBoxes, cardFields } from "../src/lib/task-card.js";

// A DELIVERY CROSSES REPOSITORIES (change 0222, ADR 0030).
//
// One planner reads the story, routes it to the repositories it touches,
// opens ONE change in each (`work --delivery`), hands the tasks to
// executors as self-contained cards (`change card`), closes each change and
// then the delivery — whose state is read from the projects, never copied.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function workspace() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-delivery-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
    spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
  const ws = path.join(root, "ws");
  for (const name of ["back-end", "front-core", "app"]) {
    mkdirSync(path.join(root, name));
    spawnSync("git", ["init", "-q"], { cwd: path.join(root, name) });
  }
  assert.equal(run(root, ["workspace", "init", "ws", "--no-git"]).status, 0);
  assert.equal(run(ws, ["workspace", "add", "../back-end", "--role", "back", "--about", "login API and sessions"]).status, 0);
  assert.equal(run(ws, ["workspace", "add", "../front-core", "--role", "front", "--about", "screens", "--depends-on", "back-end"]).status, 0);
  assert.equal(run(ws, ["workspace", "add", "../app", "--role", "app"]).status, 0);
  // A routed project must be ready — a spec to change (change 0226).
  for (const name of ["back-end", "front-core", "app"]) assert.equal(run(path.join(root, name), ["spec", "new", "core"]).status, 0);
  return { root, ws, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

const DELIVERY = "0001-tela-de-login";

// What a planner writes once the code is out: the story, the release
// claims ticked, what was watched (change 0224).
function writeRecord(/** @type {string} */ file) {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    .replace(/## Story\n\n<!--[\s\S]*?-->\n/, "## Story\n\nComo cliente, quero ver a tela de login bloqueada após 5 tentativas.\n")
    .replace(/- \[ \] /g, "- [x] ")
    .replace(/(## Observability\n\n<!--[\s\S]*?-->)/, "$1\n\n- Datadog monitor auth-5xx, 24h after release: no change.");
  writeFileSync(file, text);
}

test("delivery new writes the file and the playbook; route orders the projects", () => {
  const s = workspace();
  try {
    const r = s.run(s.ws, ["delivery", "new", "Tela de login", "--ref", "SHOP-42"]);
    assert.equal(r.status, 0, r.stderr);
    const file = readFileSync(path.join(s.ws, "deliveries", DELIVERY, "delivery.md"), "utf8");
    assert.match(file, /^# Delivery 0001-tela-de-login — Tela de login$/m);
    assert.match(file, /- \*\*Ref:\*\* SHOP-42/);
    for (const h of ["Story", "Sources", "Plan", "Release", "Observability"]) assert.match(file, new RegExp(`^## ${h}$`, "m"));
    assert.match(r.stdout, /Delivery playbook/);
    assert.match(r.stdout, /back-end\s+shares login/);
    assert.match(r.stdout, /one writer per repository/);
    const route = s.run(s.ws, ["delivery", "route", "1", "front-core,back-end"]);
    assert.equal(route.status, 0, route.stderr);
    assert.match(route.stdout, /back-end → front-core/);
    assert.match(route.stdout, /doctrina work "Tela de login" --delivery 0001-tela-de-login/);
    assert.match(readFileSync(path.join(s.ws, "deliveries", DELIVERY, "delivery.md"), "utf8"), /- \*\*Projects:\*\* back-end, front-core/);
    assert.equal(s.run(s.ws, ["delivery", "route", "1", "nope"]).status, 2);
  } finally {
    s.done();
  }
});

test("work --delivery stamps a routed repository and refuses the others", () => {
  const s = workspace();
  try {
    s.run(s.ws, ["delivery", "new", "Tela de login", "--projects", "back-end,front-core"]);
    const back = path.join(s.root, "back-end");
    const ok = s.run(back, ["work", "Tela de login", "--delivery", DELIVERY, "--quiet"]);
    assert.equal(ok.status, 0, ok.stderr);
    const changes = path.join(s.ws, "projects", "back-end", ".doctrina", "changes");
    const id = readdirSync(changes).find((d) => /^0001-/.test(d));
    assert.ok(id);
    assert.match(readFileSync(path.join(changes, String(id), "proposal.md"), "utf8"), /- \*\*Delivery:\*\* 0001-tela-de-login/);
    const app = path.join(s.root, "app");
    const unrouted = s.run(app, ["work", "Tela de login", "--delivery", DELIVERY, "--quiet"]);
    assert.equal(unrouted.status, 3);
    assert.match(unrouted.stderr, /not routed to app/);
    assert.match(unrouted.stderr, /delivery route/);
    assert.equal(s.run(app, ["work", "Tela de login", "--delivery", "9999-x", "--quiet"]).status, 2);
    assert.deepEqual(readdirSync(path.join(s.ws, "projects", "app", ".doctrina", "changes")).filter((d) => d !== "archive" && !d.startsWith(".")), [], "nothing opened");
  } finally {
    s.done();
  }
});

test("the delivery closes only when every routed project's change is archived", () => {
  const s = workspace();
  try {
    s.run(s.ws, ["delivery", "new", "Tela de login", "--projects", "back-end"]);
    const check0 = s.run(s.ws, ["delivery", "check", "1"]);
    assert.equal(check0.status, 1);
    assert.match(check0.stdout, /back-end: no change carries this delivery/);
    const back = path.join(s.root, "back-end");
    s.run(back, ["work", "Tela de login", "--delivery", DELIVERY, "--quiet", "--chore"]);
    const changes = path.join(s.ws, "projects", "back-end", ".doctrina", "changes");
    const id = String(readdirSync(changes).find((d) => /^0001-/.test(d)));
    const check1 = s.run(s.ws, ["delivery", "check", "1"]);
    assert.equal(check1.status, 1);
    assert.match(check1.stdout, new RegExp(`change ${id} is proposed`));
    assert.equal(s.run(s.ws, ["delivery", "close", "1"]).status, 1, "close refuses while the check fails");
    // Archive it the way a finished change ends up.
    mkdirSync(path.join(changes, "archive"), { recursive: true });
    renameSync(path.join(changes, id), path.join(changes, "archive", `2026-11-03-${id}`));
    assert.match(s.run(s.ws, ["delivery", "status", "1"]).stdout, /archived\s+0001-/);
    // The changes are closed; the delivery's own record is not written yet.
    const record = s.run(s.ws, ["delivery", "check", "1"]);
    assert.equal(record.status, 1);
    assert.match(record.stdout, /## Story is empty/);
    assert.match(record.stdout, /## Release: unticked — Every project's change is merged/);
    assert.match(record.stdout, /## Observability is empty/);
    writeRecord(path.join(s.ws, "deliveries", DELIVERY, "delivery.md"));
    assert.equal(s.run(s.ws, ["delivery", "check", "1"]).status, 0);
    const close = s.run(s.ws, ["delivery", "close", "1"]);
    assert.equal(close.status, 0, close.stdout);
    assert.match(close.stdout, /Tell the human: delivery 0001-tela-de-login is closed/);
    const file = readFileSync(path.join(s.ws, "deliveries", DELIVERY, "delivery.md"), "utf8");
    assert.match(file, /- \*\*Status:\*\* closed/);
    assert.match(file, /- \*\*Closed:\*\* \d{4}-\d{2}-\d{2}/);
    const list = s.run(s.ws, ["delivery", "list"]).stdout;
    assert.match(list, /closed .* 1\/1 changes closed, lead time \d+d/);
    assert.match(list, /1 closed · median lead time \d+d/);
  } finally {
    s.done();
  }
});

test("change card hands the next open task over with everything it needs", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-card-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    run(["init", "--non-interactive", "--project-name", "loja", "--project-description", "x"]);
    run(["spec", "new", "pagamento"]);
    const spec = path.join(dir, ".doctrina", "specs", "pagamento", "spec.md");
    // Normalised first: a Windows checkout scaffolds with CRLF.
    writeFileSync(spec, readFileSync(spec, "utf8").replace(/\r\n/g, "\n").replace(/### Ubiquitous\n/, "### Ubiquitous\n\n- The system shall answer 402 when the card is declined.\n"));
    run(["change", "new", "0001-recusa", "Pagamento recusado"]);
    const ch = path.join(dir, ".doctrina", "changes", "0001-recusa");
    const proposal = readFileSync(path.join(ch, "proposal.md"), "utf8").replace(/\r\n/g, "\n")
      .replace(/## Why\n\n[\s\S]*?\n## What/, "## Why\n\nO cliente precisa saber que o cartão foi recusado.\n\n## What");
    writeFileSync(path.join(ch, "proposal.md"), proposal);
    run(["change", "delta", "0001-recusa", "pagamento", "--bump", "patch"]);
    writeFileSync(path.join(ch, "tasks.md"), [
      "# Tasks", "",
      "- [x] Ler a spec",
      "- [ ] Cenário de cartão declined com status 402",
      "  - Files: features/pagamento.feature",
      "  - Verify: behave features/pagamento.feature",
      "- [ ] Atualizar a documentação", "",
    ].join("\n"));
    const r = run(["change", "card", "0001-recusa"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /# Task card — 0001-recusa, task 2 of 3/);
    assert.match(r.stdout, /- Files: features\/pagamento\.feature/);
    assert.match(r.stdout, /O cliente precisa saber/);
    assert.match(r.stdout, /## Spec — pagamento \(cut to this task\)/);
    assert.match(r.stdout, /402/);
    assert.match(r.stdout, /`behave features\/pagamento\.feature`/);
    assert.match(r.stdout, /doctrina change tick 0001-recusa 2/);
    assert.match(run(["change", "card", "0001-recusa", "3"]).stdout, /task 3 of 3/);
    assert.equal(run(["change", "card", "0001-recusa", "9"]).status, 3);
    run(["change", "tick", "0001-recusa", "--all"]);
    const done = run(["change", "card", "0001-recusa"]);
    assert.equal(done.status, 0);
    assert.match(done.stdout, /every task is ticked/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a card's indented lines are read as its fields", () => {
  const boxes = taskBoxes("- [ ] Do it\n  - Files: a.js\n  - Verify: npm test\n- [ ] Next\n");
  assert.deepEqual(boxes.map((b) => b.ordinal), [1, 2]);
  assert.deepEqual(boxes[0].details, ["Files: a.js", "Verify: npm test"]);
  assert.deepEqual(cardFields(boxes[0].details), { files: "a.js", verify: "npm test" });
  assert.deepEqual(boxes[1].details, []);
});

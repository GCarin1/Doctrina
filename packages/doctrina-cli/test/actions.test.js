import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0032 — `next` answers with records, not prose.
//
// The defect these pin: the CLI assembled the exact command, then handed
// it back as a sentence for the agent to re-read. `--json` returned that
// same sentence in quotes. The three properties below are what "structured"
// has to mean for it to be worth the change:
//
//   1. a consumer can re-issue the command WITHOUT parsing English;
//   2. the human line is unchanged, so the structure is not a rewrite;
//   3. `--run` executes what is safe and refuses what needs a person.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-actions-"));
  const res = run(dir, ["init", "--non-interactive", "--project-name", "Acme"]);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
  return dir;
}

// Plan a scaffolded change the way the gates require: real task text, and a
// proposal that actually says why and what. `analyze` refuses either left as
// scaffold, so a fixture that skips this is testing a rejected state.
function plan(dir, id) {
  const changeDir = path.join(dir, ".doctrina", "changes", id);
  const tasks = path.join(changeDir, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^(\s*-\s*\[[ xX]\])\s*$/gm, "$1 do the work"));
  const proposalPath = path.join(changeDir, "proposal.md");
  let text = readFileSync(proposalPath, "utf8");
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  for (const [heading, prose] of [["Why", "Because the fixture needs a reason."],
                                  ["What", "The shape of the change under test."]]) {
    const at = text.search(new RegExp(`^##[ \\t]+${heading}[ \\t]*\\r?$`, "m"));
    if (at < 0) continue;
    const headEnd = text.indexOf("\n", at) + 1;
    const rest = text.slice(headEnd);
    const nextAt = rest.search(/^##[ \t]/m);
    const body = nextAt < 0 ? rest : rest.slice(0, nextAt);
    if (body.replace(/<!--[\s\S]*?-->/g, "").trim() !== "") continue;
    text = text.slice(0, headEnd) + nl + prose + nl + nl + (nextAt < 0 ? "" : rest.slice(nextAt));
  }
  writeFileSync(proposalPath, text);
}

function tickAll(dir, id) {
  const tasks = path.join(dir, ".doctrina", "changes", id, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replaceAll("- [ ]", "- [x]"));
}

function actionsOf(dir) {
  const res = run(dir, ["next", "--json"]);
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout).actions;
}

test("an action carries the command and its arguments, not a sentence to parse", () => {
  const dir = project();
  try {
    run(dir, ["change", "new", "0001-x", "do x"]);
    plan(dir, "0001-x");
    tickAll(dir, "0001-x");
    const deltaPath = path.join(dir, ".doctrina", "changes", "0001-x", "specs", "core", "delta.md");
    mkdirSync(path.dirname(deltaPath), { recursive: true });
    writeFileSync(deltaPath,
      "# Spec Delta — capability: core\n\n**Operation:** ADDED\n" +
      "**Target spec on apply:** `.doctrina/specs/core/spec.md`\n\n---\n\n# Spec — Core\n\nbody\n");

    const a = actionsOf(dir).find((x) => x.id === "change-apply-ready");
    assert.ok(a, "expected the apply-ready action");
    assert.equal(a.command, "analyze");
    assert.deepEqual(a.args, ["0001-x"]);
    assert.equal(a.gate, "structure");
    assert.equal(a.severity, "blocking");
    assert.equal(a.runnable, true);

    // The whole point: re-issue from the fields, with no string parsing.
    const reissued = run(dir, [a.command, ...a.args]);
    assert.equal(reissued.status, 0, reissued.stderr || reissued.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the human line is unchanged — structure is not a rewrite", () => {
  const dir = project();
  try {
    run(dir, ["change", "new", "0001-x", "do x"]);
    plan(dir, "0001-x");

    // Every rendered `text` is exactly the line the terminal prints, and
    // `prime` prints the same lines from the same records.
    const texts = actionsOf(dir).map((a) => a.text);
    const plain = run(dir, ["next"]).stdout;
    for (const t of texts) assert.ok(plain.includes(t), `next omitted: ${t}`);

    const primed = run(dir, ["prime"]).stdout;
    assert.ok(primed.includes(texts[0]), `prime omitted: ${texts[0]}`);
    assert.ok(run(dir, ["handoff"]).stdout.includes(texts[0]));

    // The exact wording the previous release printed, kept verbatim.
    assert.match(plain, /complete \d+ open tasks in \.doctrina\/changes\/0001-x\/tasks\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--run executes the first runnable action and stops", () => {
  const dir = project();
  try {
    // Index drift is runnable: mechanical, idempotent, and the whole of
    // what the action asks for.
    const indexPath = path.join(dir, ".doctrina", "index.json");
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    index.artifacts.specs.push({
      id: "ghost", path: ".doctrina/specs/ghost/spec.md",
      status: "active", version: "0.1.0", last_updated: "2026-01-01",
    });
    writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");

    const drift = actionsOf(dir).find((a) => a.id === "index-drift");
    assert.ok(drift, "expected the drift action");
    assert.equal(drift.runnable, true);

    const res = run(dir, ["next", "--run"]);
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /doctrina index rebuild/);
    assert.ok(!actionsOf(dir).some((a) => a.id === "index-drift"), "drift should be cleared");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--run refuses an action that needs a person, and names it", () => {
  const dir = project();
  try {
    // An open change with unchecked tasks. Nothing here is executable:
    // the only thing that clears it is doing the work, and `change tick`
    // would tick a box nobody earned.
    run(dir, ["change", "new", "0001-x", "do x"]);
    plan(dir, "0001-x");

    const open = actionsOf(dir).find((a) => a.id === "change-tasks-open");
    assert.ok(open, "expected the open-tasks action");
    assert.equal(open.runnable, false);
    assert.equal(open.command, null, "no command should be offered for work only a person can do");

    const res = run(dir, ["next", "--run"]);
    assert.equal(res.status, 0, "refusing is not a failure");
    assert.match(res.stdout, /needs a person, not a command/);
    assert.match(res.stdout, /complete \d+ open tasks/);

    // Nothing was ticked on the way past.
    const tasks = readFileSync(path.join(dir, ".doctrina", "changes", "0001-x", "tasks.md"), "utf8");
    assert.equal((tasks.match(/^-\s+\[x\]/gm) ?? []).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("accepting an ADR is never runnable, however mechanical the edit", () => {
  const dir = project();
  try {
    run(dir, ["decision", "new", "Adopt Postgres"]);
    const adr = actionsOf(dir).find((a) => a.id === "adr-proposed");
    assert.ok(adr, "expected the proposed-ADR action");
    // The command IS offered — the agent should know what to type — but
    // running it unattended would be the CLI making the decision.
    assert.equal(adr.command, "decision accept");
    assert.deepEqual(adr.args, ["0001"]);
    assert.equal(adr.runnable, false);

    run(dir, ["next", "--run"]);
    const text = readFileSync(path.join(dir, ".doctrina", "decisions", "0001-adopt-postgres.md"), "utf8");
    assert.match(text, /Status:\*\*\s*proposed/, "--run must not have accepted the ADR");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("outside a project, next names init and refuses to run it", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-empty-"));
  try {
    assert.ok(!existsSync(path.join(dir, ".doctrina")));
    const payload = JSON.parse(run(dir, ["next", "--json"]).stdout);
    assert.equal(payload.actions[0].command, "init");
    assert.equal(payload.actions[0].runnable, false, "scaffolding a project is the user's call");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

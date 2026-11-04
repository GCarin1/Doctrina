// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { eolOf, withEol } from "../src/lib/fs-ops.js";
import { recordBlockers, releaseBoxes, setDeliveryHeader } from "../src/lib/delivery.js";

// A CRLF FILE STAYS CRLF (change 0228).
//
// A Windows checkout with core.autocrlf stores the artifacts as CRLF. Four
// commands that rewrite a file the person owns — `delivery tick`, the
// delivery header writer behind `delivery route`, `change tick` and the
// `Delivery:` line `work --delivery` stamps — wrote LF back, or inserted an
// LF line into a CRLF file. Either way every line shows as changed in the
// diff. Each case here starts from a CRLF file and asks that no bare LF
// survives the command.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

/** Whether the text has a line feed that is not part of a CRLF pair. */
const bareLf = (/** @type {string} */ text) => /(^|[^\r])\n/.test(text);
const toCrlf = (/** @type {string} */ p) => writeFileSync(p, readFileSync(p, "utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"));

function workspace() {
  const root = mkdtempSync(path.join(os.tmpdir(), "doctrina-crlf-"));
  const env = { ...process.env, NO_COLOR: "1", DOCTRINA_HOME: path.join(root, "home") };
  delete env.DOCTRINA_WORKSPACE;
  const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
    spawnSync(process.execPath, [cliEntry, ...args], { cwd, encoding: "utf8", env });
  const ws = path.join(root, "ws");
  const api = path.join(root, "api");
  mkdirSync(api);
  spawnSync("git", ["init", "-q"], { cwd: api });
  run(root, ["workspace", "init", "ws", "--no-git"]);
  run(ws, ["workspace", "add", "../api", "--role", "back"]);
  run(api, ["spec", "new", "auth"]);
  const deliveryFile = () => {
    const dir = readdirSync(path.join(ws, "deliveries")).find((d) => /^0001-/.test(d));
    return path.join(ws, "deliveries", String(dir), "delivery.md");
  };
  return { root, ws, api, run, deliveryFile, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("the line ending helpers read and write the file's own ending", () => {
  assert.equal(eolOf("a\r\nb\r\n"), "\r\n");
  assert.equal(eolOf("a\nb\n"), "\n");
  assert.equal(eolOf(""), "\n");
  assert.equal(withEol("a\nb\r\nc\n", "\r\n"), "a\r\nb\r\nc\r\n", "a mixed file comes out one ending");
  assert.equal(withEol("a\r\nb\r\n", "\n"), "a\nb\n");
});

test("delivery tick keeps a CRLF delivery CRLF, and counts only what it ticked", () => {
  const s = workspace();
  try {
    assert.equal(s.run(s.ws, ["delivery", "new", "Login"]).status, 0);
    toCrlf(s.deliveryFile());
    assert.match(s.run(s.ws, ["delivery", "tick", "1", "1"]).stdout, /ticked 1 Release box/);
    const text = readFileSync(s.deliveryFile(), "utf8");
    assert.match(text, /- \[x\] Every project's change is merged/);
    assert.ok(!bareLf(text), "no LF-only line after the tick");
    assert.match(s.run(s.ws, ["delivery", "tick", "1", "1"]).stdout, /nothing to tick/, "a ticked box is not ticked again");
    assert.match(s.run(s.ws, ["delivery", "tick", "1", "2", "2"]).stdout, /ticked 1 Release box/, "a box named twice is one tick");
  } finally {
    s.done();
  }
});

test("the delivery header writer keeps a CRLF delivery CRLF when it adds a line", () => {
  const s = workspace();
  try {
    assert.equal(s.run(s.ws, ["delivery", "new", "Login"]).status, 0);
    toCrlf(s.deliveryFile());
    assert.equal(s.run(s.ws, ["delivery", "route", "1", "api"]).status, 0, "rewrites a line it has");
    const id = path.basename(path.dirname(s.deliveryFile()));
    setDeliveryHeader(s.ws, id, "Closed", "2026-11-04");
    const text = readFileSync(s.deliveryFile(), "utf8");
    assert.match(text, /- \*\*Projects:\*\* api\r\n- \*\*Closed:\*\* 2026-11-04\r\n/, "adds the line it lacks after Projects");
    assert.ok(!bareLf(text));
  } finally {
    s.done();
  }
});

test("delivery check holds every Release box tick can see, whatever its bullet", () => {
  const text = "# D\n\n## Story\n\nx\n\n## Release\n\n+ [ ] Plus bullet claim\n* [x] Star done\n\n## Observability\n\nwatched\n";
  assert.deepEqual(recordBlockers({ text }), ["## Release: unticked — Plus bullet claim"]);
  assert.deepEqual(releaseBoxes(text).map((b) => b.text), ["Plus bullet claim", "Star done"]);
});

test("work --resume --delivery and change tick keep a CRLF proposal CRLF", () => {
  const s = workspace();
  try {
    assert.equal(s.run(s.ws, ["delivery", "new", "Login", "--projects", "api"]).status, 0);
    const opened = s.run(s.api, ["work", "Add the login endpoint", "--capability", "auth", "--quiet"]);
    assert.equal(opened.status, 0, opened.stderr);
    const id = readdirSync(path.join(s.api, ".doctrina", "changes")).find((d) => /^\d{4}-/.test(d));
    const dir = path.join(s.api, ".doctrina", "changes", String(id));
    toCrlf(path.join(dir, "proposal.md"));
    toCrlf(path.join(dir, "tasks.md"));
    const joined = s.run(s.api, ["work", "--resume", String(id), "--delivery", "0001", "--quiet"]);
    assert.equal(joined.status, 0, joined.stderr);
    const proposal = readFileSync(path.join(dir, "proposal.md"), "utf8");
    assert.match(proposal, /- \*\*Delivery:\*\* 0001-login/);
    assert.ok(!bareLf(proposal), "the stamped Delivery line is CRLF like the rest");
    writeFileSync(path.join(dir, "tasks.md"), readFileSync(path.join(dir, "tasks.md"), "utf8").replace("- [ ]\r\n", "- [ ] Write the endpoint\r\n"));
    assert.equal(s.run(s.api, ["change", "tick", String(id), "1"]).status, 0);
    const tasks = readFileSync(path.join(dir, "tasks.md"), "utf8");
    assert.match(tasks, /- \[x\] Write the endpoint/);
    assert.ok(!bareLf(tasks), "change tick keeps the CRLF it found");
  } finally {
    s.done();
  }
});

// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { appliedDeltas, pendingOps, recordAppliedDeltas } from "../src/lib/applied-deltas.js";

// THE DELTA THAT ARRIVES AFTER THE APPLY IS APPLIED (change 0247).
//
// Closing change 0246 on this repository: the close applied (the change had
// no delta yet), stopped at a failing test, and the fix for that test was a
// delta. The next close said "already applied — nothing to do" and went on.
// The test happened to be the one that noticed; with any other failure the
// change would have been archived naming a spec it never touched. The stamp
// is the change's, and a change is not finished when it is stamped.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-late-delta-"));
  const run = (/** @type {string[]} */ args) => {
    const r = spawnSync(process.execPath, [cliEntry, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  spawnSync("git", ["init", "-q"], { cwd: dir });
  run(["init", "--non-interactive", "--project-name", "late"]);
  for (const cap of ["auth", "billing"]) {
    run(["spec", "new", cap]);
    // No placeholder criterion: the scoped coverage gate is not this test's subject.
    const spec = path.join(dir, ".doctrina", "specs", cap, "spec.md");
    writeFileSync(spec, readFileSync(spec, "utf8").replace(/^1\. .*$/m, "1. [verified] The spec exists — verified by `.doctrina/verify.json`."));
  }
  // A build gate that fails until the file `ok` exists.
  writeFileSync(path.join(dir, ".doctrina", "verify.json"), JSON.stringify({
    checks: [{ name: "gate", run: "node -e \"process.exit(require('fs').existsSync('ok')?0:1)\"" }],
  }));
  run(["index", "rebuild"]);
  run(["work", "sign in", "--title", "sign-in", "--capability", "auth", "--quiet"]);
  const id = "0001-sign-in";
  const change = path.join(dir, ".doctrina", "changes", id);
  const proposal = path.join(change, "proposal.md");
  writeFileSync(proposal, readFileSync(proposal, "utf8").replace(/## What\r?\n\r?\n<!--[\s\S]*?-->\r?\n/, "## What\n\nThe sign-in answers.\n"));
  const tasks = path.join(change, "tasks.md");
  writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/(- \[ \]\r?\n){3}/, "- [ ] Answer.\n"));
  run(["change", "delta", id, "auth", "--bump", "minor", "--requirement", "event: When a user signs in, the system shall answer 200."]);
  run(["change", "tick", id, "--all"]);
  const spec = (/** @type {string} */ cap) => readFileSync(path.join(dir, ".doctrina", "specs", cap, "spec.md"), "utf8");
  return { dir, run, id, change, proposal, spec, done: () => rmSync(dir, { recursive: true, force: true }) };
}

const count = (/** @type {string} */ text, /** @type {string} */ needle) => text.split(needle).length - 1;

test("the record names every op the stamp covers, and what is not in it is pending", () => {
  const recorded = recordAppliedDeltas("# Change\n\n## Why\n\nBecause.\n", [["specs/auth/delta.md", ["aaaa1111", "bbbb2222"]]]);
  assert.match(recorded, /\n\n<!-- doctrina:applied-deltas specs\/auth\/delta\.md=aaaa1111,bbbb2222 -->\n$/);
  assert.deepEqual(appliedDeltas(recorded)?.get("specs/auth/delta.md"), ["aaaa1111", "bbbb2222"]);
  assert.equal(appliedDeltas("# Change\n"), null, "a proposal an older CLI applied carries no record");
  assert.equal(appliedDeltas(recordAppliedDeltas("# Change\n", []))?.size, 0, "applied with no delta at all");
  assert.equal(count(recordAppliedDeltas(recorded, []), "doctrina:applied-deltas"), 1, "replaced, never repeated");

  assert.deepEqual(pendingOps(["a", "b"], ["a", "b"]), { fresh: [], gone: false });
  assert.deepEqual(pendingOps(["a", "bump"], ["a", "c", "bump"]), { fresh: [1], gone: false }, "an op added in the middle is the only one pending");
  assert.deepEqual(pendingOps(["a", "a"], ["a", "a", "a"]), { fresh: [2], gone: false }, "the same op twice is two ops");
  assert.deepEqual(pendingOps(["a", "b"], ["a", "x"]), { fresh: [1], gone: true }, "an applied op that changed is not pending — it is gone");
});

test("ops and a delta added after a close that stopped are applied by the next close, once", () => {
  const p = project();
  try {
    const first = p.run(["close", p.id]);
    assert.match(first.out, /close stopped at "verify"/);
    assert.equal(count(p.spec("auth"), "shall answer 200"), 1, "the apply ran before the gate that stopped it");
    assert.match(readFileSync(p.proposal, "utf8"), /- \*\*Status:\*\* applied/);
    assert.match(readFileSync(p.proposal, "utf8"), /<!-- doctrina:applied-deltas specs\/auth\/delta\.md=[0-9a-f]{8},[0-9a-f]{8} -->/);

    // The repair: one more op in the delta that is there, and a delta that was not.
    p.run(["change", "delta", p.id, "auth", "--requirement", "event: When the password is wrong, the system shall answer 401."]);
    p.run(["change", "delta", p.id, "billing", "--requirement", "event: When a user signs in, the system shall open the invoice list."]);
    writeFileSync(path.join(p.dir, "ok"), "");
    const second = p.run(["close", p.id]);
    assert.match(second.out, /was applied before this was added — applying only specs\/auth\/delta\.md \(1 new op\), specs\/billing\/delta\.md/);
    assert.equal(second.status, 0, second.out);
    assert.equal(count(p.spec("auth"), "shall answer 200"), 1, "what was applied is not applied again");
    assert.equal(count(p.spec("auth"), "shall answer 401"), 1);
    assert.equal(count(p.spec("billing"), "shall open the invoice list"), 1);
    assert.match(p.spec("auth"), /^\*\*Version:\*\* 0\.2\.0$/m, "one bump, not two");
    assert.equal(existsSync(p.change), false, "archived");
  } finally {
    p.done();
  }
});

test("an applied op that was edited stops the apply instead of landing twice", () => {
  const p = project();
  try {
    p.run(["close", p.id]);
    const delta = path.join(p.change, "specs", "auth", "delta.md");
    writeFileSync(delta, readFileSync(delta, "utf8").replace("shall answer 200", "shall answer 204"));
    const again = p.run(["change", "apply", p.id]);
    assert.equal(again.status, 1, again.out);
    assert.match(again.out, /specs\/auth\/delta\.md: an op that was already applied changed or was removed/);
    assert.match(again.out, /restore the op as it was applied and add the correction as a new op/);
    assert.equal(count(p.spec("auth"), "shall answer 204"), 0, "nothing was written");
  } finally {
    p.done();
  }
});

test("an applied change with no record is left alone, as before", () => {
  const p = project();
  try {
    p.run(["close", p.id]);
    writeFileSync(p.proposal, readFileSync(p.proposal, "utf8").replace(/<!-- doctrina:applied-deltas [^>]*-->\n?/, ""));
    p.run(["change", "delta", p.id, "auth", "--requirement", "event: When the password is wrong, the system shall answer 401."]);
    const again = p.run(["change", "apply", p.id]);
    assert.match(again.out, /already applied — nothing to do/, "without the record there is no telling what was applied");
    assert.equal(count(p.spec("auth"), "shall answer 401"), 0);
  } finally {
    p.done();
  }
});

// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { applyOps, parseOp, specShape } from "../src/lib/spec-ops.js";

// A SPEC CAN SHRINK (change 0206).
//
// A field review of 0.17: "specs become lists that only grow". Every verb
// added or replaced; none took a requirement or a criterion out, so a
// superseded rule stayed beside its successor for good. And
// `replace-criterion` replaced only the FIRST line of a wrapped criterion,
// leaving the old proof's tail under the new one — the bug
// `replace-requirement` had already been fixed for.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

const SPEC = `# Spec — auth

**Capability:** auth
**Status:** draft
**Implementation:** planned
**Version:** 0.3.0

## Purpose

Auth.

## Requirements (EARS)

### Ubiquitous

- The system shall hash passwords
  with a per-user salt.
- The system shall hash passwords.

### Event-driven

- When a user logs in, the system shall issue a token.

## Acceptance criteria

1. [verified] a password is stored hashed
   and salted — verified by \`test/a.test.js\`.
2. [verified] a password is stored hashed — verified by \`test/a.test.js\`.
3. [verified] a login issues a token — verified by \`test/b.test.js\`.
`;

const apply = (/** @type {string[]} */ lines) => applyOps(SPEC, lines.map(parseOp));

test("remove-requirement and remove-criterion take the whole item, and the criteria renumber", () => {
  const r = apply(["remove-requirement ubiquitous 1: the salted form is criterion 1's", "remove-criterion 2: duplicate of 1"]);
  assert.deepEqual(r.errors, []);
  assert.doesNotMatch(r.text, /with a per-user salt/, "the continuation line went with its bullet");
  assert.match(r.text, /### Ubiquitous\n\n- The system shall hash passwords\.\n/);
  assert.match(r.text, /1\. \[verified\] a password is stored hashed\n   and salted/);
  assert.match(r.text, /\n2\. \[verified\] a login issues a token/, "criterion 3 is now 2");
  assert.doesNotMatch(r.text, /\n3\. /);
});

test("replace-criterion replaces a wrapped criterion whole", () => {
  const r = apply(["replace-criterion 1: [verified] a password is stored salted — verified by `test/a.test.js`."]);
  assert.deepEqual(r.errors, []);
  assert.doesNotMatch(r.text, /and salted — verified/, "no orphaned tail of the old criterion");
});

test("a removal that names nothing refuses, and the grammar rejects a malformed one", () => {
  assert.match(apply(["remove-requirement event 4"]).errors[0], /has 1 requirement, no #4/);
  assert.match(apply(["remove-criterion 9"]).errors[0], /no criterion #9/);
  assert.ok(parseOp("remove-requirement weird 1").error);
  assert.ok(parseOp("remove-criterion x").error);
});

test("specShape measures what --consolidate reports", () => {
  assert.deepEqual(specShape(SPEC), {
    lines: SPEC.split("\n").length, requirements: 3, sections: { ubiquitous: 2, event: 1 }, criteria: 3,
  });
});

test("work --consolidate opens a pinned change with the consolidation playbook", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-consolidate-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
    assert.equal(run(["spec", "new", "auth"]).status, 0);
    writeFileSync(path.join(dir, ".doctrina", "specs", "auth", "spec.md"), SPEC);
    assert.equal(run(["index", "rebuild"]).status, 0);

    const out = run(["work", "--consolidate", "auth"]);
    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /Consolidation playbook — change 0001-consolidate-auth/);
    assert.match(out.stdout, /auth — \d+ lines · 3 requirements \(ubiquitous 2 · event 1\) · 3 acceptance criteria/);
    assert.match(out.stdout, /doctrina change delta 0001-consolidate-auth auth --op "remove-requirement/);
    const proposal = readFileSync(path.join(dir, ".doctrina", "changes", "0001-consolidate-auth", "proposal.md"), "utf8");
    assert.match(proposal, /- \*\*Affects specs:\*\* auth/);
    assert.match(readFileSync(path.join(dir, ".doctrina", "changes", "0001-consolidate-auth", "specs", "auth", "delta.md"), "utf8"),
      /\*\*Operation:\*\* MODIFIED/);

    // The consolidation is driven by the same ops.
    assert.equal(run(["change", "delta", "0001-consolidate-auth", "auth", "--op", "remove-criterion 2: duplicate of 1"]).status, 0);
    assert.match(run(["change", "check", "0001-consolidate-auth"]).stdout, /1 op would apply cleanly/);

    assert.equal(run(["work", "--consolidate", "nope"]).status, 2);

    // The size-cap warning names the command that answers it.
    writeFileSync(path.join(dir, ".doctrina", "specs", "auth", "spec.md"),
      SPEC.replace("Auth.\n", `Auth.\n${"\nfiller line".repeat(420)}\n`));
    const big = run(["validate"]);
    assert.match(big.stdout + big.stderr, /\(>400 soft cap\) — consolidate it: `doctrina work --consolidate auth`/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

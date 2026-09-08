import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { isUnwrittenSection, unwrittenSections } from "../src/lib/doc-model.js";

// Change 0065 — the mould does not pass for content.
//
// Doctrina writes its artifacts from templates and then trusts that someone
// filled them in. Exactly one gate checked that — `analyze`, over a change
// proposal — and everything else took the mould for a decision:
//
//   `decision accept` accepted an ADR whose Context, Decision and
//   Consequences were 100% template comment. An accepted ADR is IMMUTABLE,
//   becomes a standing rule in `prime --rules`, and loads into every pack it
//   governs. `validate` warned afterwards, but only about missing Evidence.
//
//   A spec that was entirely scaffold passed `validate` and `clarify`. Its
//   placeholder criterion — "[unverified] <observable signal> — verified by
//   `path/to/test`" — survived into an ACTIVE spec and surfaced days later as
//   a coverage failure in the close of an unrelated change.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-mould-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return dir;
}

const adrPath = (dir) => {
  const d = path.join(dir, ".doctrina", "decisions");
  return path.join(d, readdirSync(d).find((f) => /^\d{4}-/.test(f)));
};

function writeSections(file, bodies) {
  let text = readFileSync(file, "utf8");
  for (const [name, body] of Object.entries(bodies)) {
    text = text.replace(new RegExp(`(## ${name}\\r?\\n\\r?\\n)`), `$1${body}\n\n`);
  }
  writeFileSync(file, text);
}

// -------------------------------------------------------------- the ruler

test("a section that is only the template's annotation is unwritten", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["decision", "new", "Use an outbound queue"]).status, 0);
    const file = adrPath(dir);
    assert.deepEqual(
      unwrittenSections(readFileSync(file, "utf8"), ["Context", "Decision", "Consequences"],
        { template: "decision.md.template" }),
      ["Context", "Decision", "Consequences"]);

    writeSections(file, { Decision: "Reminders are enqueued, never sent inline." });
    const after = readFileSync(file, "utf8");
    assert.equal(isUnwrittenSection(after, "Decision", { template: "decision.md.template" }), false);
    assert.equal(isUnwrittenSection(after, "Context", { template: "decision.md.template" }), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's own accepted ADRs are all written", () => {
  const dir = path.join(repoRoot, ".doctrina", "decisions");
  const unwritten = [];
  for (const f of readdirSync(dir).filter((f) => /^\d{4}-.*\.md$/.test(f))) {
    const text = readFileSync(path.join(dir, f), "utf8");
    if (!/^-\s*\*\*Status:\*\*\s*accepted/mi.test(text)) continue;
    const gaps = unwrittenSections(text, ["Context", "Decision", "Consequences"],
      { template: "decision.md.template" });
    if (gaps.length > 0) unwritten.push(`${f}: ${gaps.join(", ")}`);
  }
  assert.deepEqual(unwritten, [], unwritten.join("\n"));
});

// ------------------------------------------------------ decision accept

test("accept refuses an ADR whose body is still the template, and names what is missing", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["decision", "new", "Use an outbound queue"]).status, 0);
    const res = run(dir, ["decision", "accept", "1"]);
    assert.equal(res.status, 1, res.stdout);
    const out = res.stdout + res.stderr;
    assert.match(out, /## Context/, out);
    assert.match(out, /## Decision/, out);
    assert.match(out, /immutable/, out);

    // And it did not half-accept: the header is untouched.
    assert.match(readFileSync(adrPath(dir), "utf8"), /^-\s*\*\*Status:\*\*\s*proposed/mi);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an ADR with a one-line decision is accepted without ceremony", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["decision", "new", "Use an outbound queue"]).status, 0);
    writeSections(adrPath(dir), {
      Context: "Sending inline ties the request to an SMTP round trip.",
      Decision: "Reminders are enqueued and sent by a worker, never inline.",
      Consequences: "A reminder can be retried; the request path stays fast.",
    });
    const res = run(dir, ["decision", "accept", "1"]);
    assert.equal(res.status, 0, res.stdout + res.stderr);
    assert.match(readFileSync(adrPath(dir), "utf8"), /^-\s*\*\*Status:\*\*\s*accepted/mi);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the refusal names a remedy that resolves it", () => {
  const dir = project();
  try {
    run(dir, ["decision", "new", "Use an outbound queue"]);
    assert.equal(run(dir, ["decision", "accept", "1"]).status, 1);
    writeSections(adrPath(dir), {
      Context: "Written.", Decision: "Written.", Consequences: "Written.",
    });
    assert.equal(run(dir, ["decision", "accept", "1"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------- the placeholder criterion

test("validate reports an acceptance criterion still in the scaffold's form", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "invoicing"]).status, 0);
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    const out = run(dir, ["validate"]).stdout + run(dir, ["validate"]).stderr;
    assert.match(out, /acceptance criterion #1 is still the scaffold's placeholder/, out);
    // It says why it matters, not just that it is there.
    assert.match(out, /resolves nowhere|dangling/, out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a written criterion citing real proof is silent", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "invoicing"]).status, 0);
    const p = path.join(dir, ".doctrina", "specs", "invoicing", "spec.md");
    writeFileSync(p, readFileSync(p, "utf8").replace(
      /^1\. \[unverified\].*$/m,
      "1. [unverified] An issued invoice carries a client and a due date — verified by `AGENTS.md`."));
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    const res = run(dir, ["validate"]);
    assert.doesNotMatch(res.stdout + res.stderr, /still the scaffold's placeholder/,
      res.stdout + res.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a draft spec being written is not accused", () => {
  // The target is the untouched mould, not work in progress: the criterion
  // warning is about the placeholder itself, so writing it clears the warning
  // whatever the document's Status is.
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "invoicing"]).status, 0);
    const p = path.join(dir, ".doctrina", "specs", "invoicing", "spec.md");
    const text = readFileSync(p, "utf8");
    assert.match(text, /^\*\*Status:\*\* draft/m, "the scaffold starts as a draft");
    writeFileSync(p, text.replace(/^1\. \[unverified\].*$/m,
      "1. [unverified] Something observable — verified by `AGENTS.md`."));
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    assert.doesNotMatch(run(dir, ["validate"]).stdout, /still the scaffold's placeholder/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

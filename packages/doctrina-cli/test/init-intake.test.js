import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { EXIT } from "../src/lib/exit-codes.js";

// Change 0051 — init accepts the intake.
//
// Onboarding is one moment and it was charged to the user as two commands.
// The separation exists because `init` refuses to read language (ADR 0005),
// which is right — and is an architectural fact, not a step of setup.
//
// Both commands stay: `intake` is still the door for converting a
// description in a project that already exists. What these pin is that the
// one-command path lands in the SAME state as the two-command path, and that
// a flag written without a value is a usage error rather than a project
// quietly scaffolded without the intake its operator asked for.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

const DESCRIPTION =
  "A billing system for small shops. Users create invoices, send them by email, " +
  "and track payment. Success is an invoice sent in under a minute.";

// Every file in the tree, with its content — the state two paths must agree
// on. The date-stamped lines are the same on both runs (same day), so they
// are compared like everything else.
function treeOf(dir) {
  const out = new Map();
  const walk = (rel) => {
    for (const entry of readdirSync(path.join(dir, rel)).sort()) {
      if (entry === ".git") continue;
      const r = path.join(rel, entry);
      if (statSync(path.join(dir, r)).isDirectory()) walk(r);
      else out.set(r.replace(/\\/g, "/"), readFileSync(path.join(dir, r), "utf8"));
    }
  };
  walk(".");
  return out;
}

test("`init --intake <file>` lands where `init` then `intake <file>` lands", () => {
  // With one documented exception, recorded here because it is the reason
  // the merged path is worth having: `init` fills AGENTS.md's project
  // description from the intake's first line, which it can only do when the
  // intake is in hand at scaffold time. Run as a sequence, `intake` arrives
  // after AGENTS.md is authored and does not rewrite it — correctly, that is
  // the file it must never touch. So the merged path is not a shortcut for
  // the sequence; it is a path that knows one more thing when it needs it.
  const one = mkdtempSync(path.join(os.tmpdir(), "doctrina-one-"));
  const two = mkdtempSync(path.join(os.tmpdir(), "doctrina-two-"));
  try {
    for (const dir of [one, two]) {
      writeFileSync(path.join(dir, "description.md"), `${DESCRIPTION}\n`);
    }
    const single = runCli(["init", "--non-interactive", "--project-name", "Acme",
      "--intake", "description.md"], one);
    assert.equal(single.status, 0, single.stderr);

    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], two).status, 0);
    assert.equal(runCli(["intake", "description.md"], two).status, 0);

    const a = treeOf(one);
    const b = treeOf(two);
    assert.deepEqual([...a.keys()], [...b.keys()], "both paths must produce the same files");
    for (const [file, content] of a) {
      if (file === "AGENTS.md") continue;
      assert.equal(content, b.get(file), `${file} differs between the one-command and two-command paths`);
    }
    // AGENTS.md differs in exactly one line: the description.
    const diff = a.get("AGENTS.md").split("\n")
      .map((line, i) => [line, b.get("AGENTS.md").split("\n")[i]])
      .filter(([x, y]) => x !== y);
    assert.equal(diff.length, 1, `AGENTS.md differs in ${diff.length} lines, expected only the description`);
    assert.ok(diff[0][0].startsWith("A billing system for small shops."),
      "the merged path fills the description from the intake's first line");
    assert.equal(diff[0][1], "", "the sequence leaves it as the scaffold left it");
    // And the single command prints the bootstrap playbook, once.
    assert.match(single.stdout, /doctrina spec new/);
    assert.equal((single.stdout.match(/Mark the intake consumed/g) ?? []).length, 1);
  } finally {
    rmSync(one, { recursive: true, force: true });
    rmSync(two, { recursive: true, force: true });
  }
});

test("`--intake-text` is the inline form of the same thing", () => {
  const inline = mkdtempSync(path.join(os.tmpdir(), "doctrina-inline-"));
  const file = mkdtempSync(path.join(os.tmpdir(), "doctrina-file-"));
  try {
    writeFileSync(path.join(file, "d.md"), DESCRIPTION);
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme",
      "--intake-text", DESCRIPTION], inline).status, 0);
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme",
      "--intake", "d.md"], file).status, 0);

    const a = readFileSync(path.join(inline, ".doctrina", "intake.md"), "utf8");
    const b = readFileSync(path.join(file, ".doctrina", "intake.md"), "utf8");
    // Same body, verbatim; only the recorded SOURCE differs, which is the
    // one fact that genuinely differs.
    assert.ok(a.includes(DESCRIPTION) && b.includes(DESCRIPTION));
    assert.match(a, /- \*\*Source:\*\* inline \(--intake-text\)/);
    assert.match(b, /- \*\*Source:\*\* d\.md/);
    assert.equal(a.replace(/^- \*\*Source:\*\*.*$/m, ""), b.replace(/^- \*\*Source:\*\*.*$/m, ""));
  } finally {
    rmSync(inline, { recursive: true, force: true });
    rmSync(file, { recursive: true, force: true });
  }
});

test("a flag with no value is a usage error, not a project without an intake", () => {
  // The failure mode this guards: the operator asked for an intake, the
  // project is scaffolded without one, and nothing says so.
  for (const args of [["--intake"], ["--intake-text"]]) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-noval-"));
    try {
      const r = runCli(["init", "--non-interactive", "--project-name", "Acme", ...args], dir);
      assert.equal(r.status, EXIT.USAGE, `${args[0]} with no value must be a usage error`);
      assert.match(r.stderr, /needs a value/);
      assert.ok(!existsSync(path.join(dir, ".doctrina", "intake.md")));
      assert.ok(!existsSync(path.join(dir, "AGENTS.md")), "a refused invocation scaffolds nothing");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("the two intake flags are alternatives, and saying so beats picking one", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-both-"));
  try {
    writeFileSync(path.join(dir, "d.md"), DESCRIPTION);
    const r = runCli(["init", "--non-interactive", "--project-name", "Acme",
      "--intake", "d.md", "--intake-text", DESCRIPTION], dir);
    assert.equal(r.status, EXIT.USAGE);
    assert.match(r.stderr, /not both/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("init without an intake is unchanged", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-plain-"));
  try {
    const r = runCli(["init", "--non-interactive", "--project-name", "Acme"], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!existsSync(path.join(dir, ".doctrina", "intake.md")));
    assert.match(r.stdout, /Next: edit AGENTS\.md/);
    assert.doesNotMatch(r.stdout, /Mark the intake consumed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

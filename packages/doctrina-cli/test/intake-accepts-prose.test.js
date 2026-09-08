import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { looksLikePath } from "../src/lib/intake-model.js";

// Change 0071 — the intake accepts the prose its own wording invites.
//
// The surface block describes the command as "store the intent". Passing the
// intent produced `error: description file not found:` followed by the
// author's whole sentence echoed back as a filename, with no mention of
// `--text` — the CLI blaming the reader for reading it. And the same idea had
// two spellings across the surface: `intake --text` and `init --intake-text`,
// so an agent that learned one did not find the other.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const DESCRIPTION = "Acme is a small invoicing tool for freelancers. It chases late payers by email.";

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function initialised() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-intake-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  return dir;
}

// ------------------------------------------------------------- the rule

test("prose and a path are told apart without guessing", () => {
  for (const p of ["intake.md", "./docs/brief.md", "../brief.md", "~/brief.md",
    "brief", "my notes.txt", "docs\\brief.md"]) {
    assert.equal(looksLikePath(p), true, `${p} must read as a path`);
  }
  for (const prose of [DESCRIPTION, "A tool.", "it issues invoices and chases payers"]) {
    assert.equal(looksLikePath(prose), false, `${prose} must read as prose`);
  }
});

test("anything that could be a path is treated as one", () => {
  // Conservative on purpose: a real file must never be read as a description.
  assert.equal(looksLikePath("brief"), true, "a single token is assumed to be a filename");
});

// -------------------------------------------------------------- `intake`

test("the description passed directly is accepted, and the CLI says how to be explicit", () => {
  const dir = initialised();
  try {
    const res = run(dir, ["intake", DESCRIPTION]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stderr, /--text/, res.stderr);
    const intake = readFileSync(path.join(dir, ".doctrina", "intake.md"), "utf8");
    assert.ok(intake.includes(DESCRIPTION), "the description is stored verbatim");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a path that does not exist is still an error, now naming the other form", () => {
  const dir = initialised();
  try {
    const res = run(dir, ["intake", "brief.md"]);
    assert.equal(res.status, 1);
    const out = res.stdout + res.stderr;
    assert.match(out, /description file not found: brief\.md/, out);
    assert.match(out, /--text/, "the message must name the form that would have worked");
    assert.equal(existsSync(path.join(dir, ".doctrina", "intake.md")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a real file still wins, and is never read as prose", () => {
  const dir = initialised();
  try {
    writeFileSync(path.join(dir, "brief.md"), "# Brief\n\nFrom the file.\n");
    const res = run(dir, ["intake", "brief.md"]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(readFileSync(path.join(dir, ".doctrina", "intake.md"), "utf8"), /From the file\./);
    assert.doesNotMatch(res.stderr, /read as the description itself/, res.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--text is unchanged and says nothing extra", () => {
  const dir = initialised();
  try {
    const res = run(dir, ["intake", "--text", DESCRIPTION]);
    assert.equal(res.status, 0, res.stderr);
    assert.doesNotMatch(res.stderr, /read as the description itself/,
      "an author who was explicit needs no note");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- `init`

test("init answers the same input shape the same way", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-init-intake-"));
  try {
    const res = run(dir, ["init", "--non-interactive", "--project-name", "Acme",
      "--intake", DESCRIPTION]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stderr, /--intake-text/, res.stderr);
    assert.ok(readFileSync(path.join(dir, ".doctrina", "intake.md"), "utf8").includes(DESCRIPTION));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("init's missing file is an error naming the other form", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-init-intake2-"));
  try {
    const res = run(dir, ["init", "--non-interactive", "--project-name", "Acme",
      "--intake", "brief.md"]);
    assert.equal(res.status, 1);
    assert.match(res.stdout + res.stderr, /--intake-text/, res.stdout + res.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("init still reads a real file", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-init-intake3-"));
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "brief.md"), "# Brief\n\nFrom the file.\n");
    const res = run(dir, ["init", "--non-interactive", "--project-name", "Acme",
      "--intake", "brief.md"]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(readFileSync(path.join(dir, ".doctrina", "intake.md"), "utf8"), /From the file\./);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

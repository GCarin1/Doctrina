import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseChangeTitle } from "../src/lib/doc-model.js";

import { slugFromPrompt } from "../src/lib/lexicon.js";
// Change 0052 — the change title stops coming out doubled.
//
// The H1 a proposal carries is `# Change <id> — <title>`, and the id itself
// contains hyphens (`NNNN-slug`). Four copies of that parse existed and got
// it wrong in two different ways:
//
//   `[^—-]*` for the id  stopped at the id's FIRST hyphen, so every
//     multi-word id — the norm `work` generates — printed the slug glued in
//     front of the title, in `prime`, `handoff` and `report`.
//   `\s*[—-]\s*` for the separator  accepted a bare hyphen with no spaces,
//     so an H1 with no separator at all had its last segment read as title.
//
// The separator is a dash WITH whitespace on both sides; an id's hyphens
// never have that. One parser owns the grammar now (ADR 0021).

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

test("the four H1 forms parse the way each one reads", () => {
  // The bug, first: a multi-word id must not leak into the title.
  assert.equal(
    parseChangeTitle("# Change 0030-declare-the-release-wiring — declare the release wiring"),
    "declare the release wiring",
  );
  // The case that always worked, still working — no regression.
  assert.equal(
    parseChangeTitle("# Change 0029 — Doctrina checks the operational surface"),
    "Doctrina checks the operational surface",
  );
  // No `Change <id> —` prefix: the H1 is the title, whole.
  assert.equal(parseChangeTitle("# Just a plain title"), "Just a plain title");
  // Degenerate: a prefix with no separator is not a prefix. Returning
  // "x" here — the id's last segment — is what the old `\s*[—-]\s*` did.
  assert.equal(parseChangeTitle("# Change 0052-x"), "Change 0052-x");
  // A hand-written hyphen separator reads as clearly as an em dash, and is
  // unambiguous for the same reason: the spaces around it.
  assert.equal(parseChangeTitle("# Change 0031-a - a hyphen separator"), "a hyphen separator");
  // Nothing to read is null, not an empty title.
  assert.equal(parseChangeTitle(""), null);
  assert.equal(parseChangeTitle("no heading here"), null);
  // The H1 may sit below front matter, and may carry a Windows line ending.
  assert.equal(parseChangeTitle("\r\n# Change 0001-a-b — title\r\nbody\r\n"), "title");
});

test("prime, handoff and report print the title, not the slug plus the title", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-title-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const id = "0001-declare-the-release-wiring";
    const title = "declare the release wiring";
    assert.equal(runCli(["change", "new", id, title], dir).status, 0);

    const h1 = readFileSync(path.join(dir, ".doctrina", "changes", id, "proposal.md"), "utf8")
      .split("\n")[0];
    assert.equal(h1, `# Change ${id} — ${title}`, "the template's H1 is the input this parses");

    for (const args of [["prime"], ["handoff"], ["report", "--since", "3650"]]) {
      const out = runCli(args, dir).stdout;
      assert.ok(out.includes(title), `${args[0]} does not print the title`);
      assert.doesNotMatch(out, new RegExp(`${id} — ${title}|${id} ${title}`),
        `${args[0]} prints the slug glued in front of the title`);
    }

    // And the index records the title alone, so every reader of index.json
    // inherits the fix rather than each fixing it again.
    assert.equal(runCli(["index", "rebuild"], dir).status, 0);
    const index = JSON.parse(readFileSync(path.join(dir, ".doctrina", "index.json"), "utf8"));
    assert.equal(index.artifacts.changes.find((ch) => ch.id === id).title, title);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the archive ledger records the title alone too", () => {
  // The fourth copy of the parse lived in `change archive`, which writes the
  // ledger line — the one record of the change that outlives its folder.
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-title-arch-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const id = "0001-a-multi-word-id";
    assert.equal(runCli(["change", "new", id, "a real title"], dir).status, 0);
    const changeDir = path.join(dir, ".doctrina", "changes", id);
    const tasks = path.join(changeDir, "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8").replace(/^- \[ \]\s*$/gm, "- [ ] do the thing"));
    const proposal = path.join(changeDir, "proposal.md");
    writeFileSync(proposal, readFileSync(proposal, "utf8")
      .replace(/(## Why\r?\n\r?\n)<!--[\s\S]*?-->/, "$1Because.")
      .replace(/(## What\r?\n\r?\n)<!--[\s\S]*?-->/, "$1A change."));
    assert.equal(runCli(["change", "tick", id, "--all"], dir).status, 0);
    assert.equal(runCli(["change", "archive", id], dir).status, 0);

    const ledger = readFileSync(
      path.join(dir, ".doctrina", "changes", "archive", "LEDGER.md"), "utf8");
    assert.match(ledger, new RegExp(`— ${id} — a real title`));
    assert.doesNotMatch(ledger, /multi-word-id — a-multi-word-id/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("one parser owns the H1 grammar", () => {
  // Four copies is how the same fact came to be wrong in two different ways.
  const src = (rel) => readFileSync(path.resolve(here, "..", "src", rel), "utf8");
  for (const file of ["lib/snapshot.js", "lib/scan.js", "commands/change.js"]) {
    assert.doesNotMatch(src(file), /#\\s\+.*Change\\s\+/,
      `${file} carries its own copy of the change-title regex`);
  }
});

// -------------------- change 0070: the title does not START out duplicated

// Change 0052 fixed the PARSE. The generation still duplicated: without
// `--title` the slug and the H1's title half were both the whole prompt, so a
// change opened on the default path said the same sentence twice and every
// read surface printed both — 133 characters of one `prime` line, the command
// whose entire value is density.
//
// The id is what a person types and what sorts a backlog, so it stays short;
// the title is what a person reads, so it stays whole. Capping the SLUG rather
// than truncating the title gives both, which is what `--title` did by hand.

test("slugFromPrompt keeps the content words and drops the rest", () => {
  assert.equal(
    slugFromPrompt("let a freelancer send a partial-payment receipt when a client pays half an invoice"),
    "let-freelancer-send-partial-payment");
  assert.equal(slugFromPrompt("flag a duplicate bank credit"), "flag-duplicate-bank-credit");
});

test("a prompt of nothing but stopwords still yields an id", () => {
  const slug = slugFromPrompt("do it now");
  assert.ok(slug.length > 0, "an id is required, so the fallback must produce one");
  assert.match(slug, /^[a-z0-9][a-z0-9-]*$/);
});

test("slugFromPrompt is deterministic", () => {
  const p = "reconcile a bank credit against an open invoice";
  assert.equal(slugFromPrompt(p), slugFromPrompt(p));
});

test("without --title the id is short and the H1 still carries the whole prompt", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-title-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const prompt =
      "let a freelancer send a partial-payment receipt when a client pays half an invoice";
    assert.equal(runCli(["work", prompt, "--quiet"], dir).status, 0);

    const id = readdirSync(path.join(dir, ".doctrina", "changes"))
      .find((n) => n.startsWith("0001-"));
    assert.ok(id, "the change was opened");
    assert.ok(id.length < 50, `the id must be typeable, got ${id.length} chars: ${id}`);

    const h1 = readFileSync(path.join(dir, ".doctrina", "changes", id, "proposal.md"), "utf8")
      .split(/\r?\n/)[0];
    assert.ok(h1.includes(prompt), `the whole prompt still reaches the H1:\n${h1}`);
    assert.equal(parseChangeTitle(h1), prompt, "and the parse returns it whole");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--title still decides both halves, unchanged", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-title2-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    assert.equal(runCli(
      ["work", "add a --pdf flag to the invoice export command", "--title", "pdf export", "--quiet"],
      dir).status, 0);
    const id = readdirSync(path.join(dir, ".doctrina", "changes"))
      .find((n) => n.startsWith("0001-"));
    assert.equal(id, "0001-pdf-export");
    const h1 = readFileSync(path.join(dir, ".doctrina", "changes", id, "proposal.md"), "utf8")
      .split(/\r?\n/)[0];
    assert.equal(parseChangeTitle(h1), "pdf export");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the CLI says how to do better, on stderr, without touching stdout", () => {
  // ADR 0005: the CLI reduces a prompt deterministically and does not try to
  // write a good name. Saying so is the honest alternative.
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-title3-"));
  try {
    assert.equal(runCli(["init", "--non-interactive", "--project-name", "Acme"], dir).status, 0);
    const res = runCli(["work", "flag a duplicate bank credit", "--quiet"], dir);
    assert.match(res.stderr, /--title/, res.stderr);
    assert.doesNotMatch(res.stdout, /note:/, "the note must not pollute the piped output");

    const quiet = runCli(["work", "another thing entirely", "--title", "another", "--quiet"], dir);
    assert.doesNotMatch(quiet.stderr, /--title/,
      "an author who already passed --title needs no nudge");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

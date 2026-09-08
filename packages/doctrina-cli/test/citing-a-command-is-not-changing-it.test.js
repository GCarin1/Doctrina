import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { documentedSurfaceSignals } from "../src/lib/docs-impact.js";

// Change 0088 — citing a command is not changing it.
//
// The docs gate reads what the AUTHOR wrote in the proposal, which is right:
// change 0058 already subtracted the template's own boilerplate for the same
// reason. What it could not tell apart was "this command is the SUBJECT" from
// "this command CHANGES". A proposal describes a symptom by naming the command
// that reports it — the most natural way to write a finding — and that tripped
// the gate.
//
// Change 0085 only reorganised headings in AGENTS.md, and was refused for
// "commands: close, templates": the two commands its own proposal cited to
// describe the finding. It had to close with --force. A gate that forces
// --force on the natural way of writing a proposal is on its way to being
// ignored.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");
const repoRoot = path.resolve(here, "..", "..", "..");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-citing-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  return dir;
}

const proposalOf = (dir, id) => path.join(dir, ".doctrina", "changes", id, "proposal.md");
const changeDir = (dir, id) => path.join(dir, ".doctrina", "changes", id);

function writeSection(file, heading, body) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === heading);
  assert.ok(start >= 0, `${heading} not found`);
  let end = start + 1;
  while (end < lines.length && !/^##\s+/.test(lines[end])) end += 1;
  writeFileSync(file, [...lines.slice(0, start + 1), "", ...body, "", ...lines.slice(end)].join("\n"));
}

test("a chore that cites commands produces no surface signal", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "reorganizar as secoes do hub", "--chore",
      "--id", "0001-hub", "--title", "hub", "--quiet"]).status, 0);
    writeSection(dir && proposalOf(dir, "0001-hub"), "## What", [
      "O `doctrina templates check` reporta duas secoes ausentes, e a frase",
      "`doctrina close <id>` passa a estar no hub.",
    ]);
    assert.deepEqual(documentedSurfaceSignals(changeDir(dir, "0001-hub"), dir), [],
      "a chore declares that no behaviour changes — the lane is the author's statement");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a chore closes without --force when it only cites", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "reorganizar as secoes do hub", "--chore",
      "--id", "0001-hub", "--title", "hub", "--quiet"]).status, 0);
    const p = proposalOf(dir, "0001-hub");
    writeSection(p, "## What", ["O `doctrina templates check` reporta o achado."]);
    writeSection(p, "## Scope boundaries", ["- Nada alem do hub."]);
    writeSection(p, "## Open questions", ["- Nenhuma."]);
    const tasks = path.join(dir, ".doctrina", "changes", "0001-hub", "tasks.md");
    writeFileSync(tasks, readFileSync(tasks, "utf8")
      .replace(/(?:^- \[ \][ \t]*\r?\n)+/m, "- [ ] Reorganizar as secoes.\n"));
    assert.equal(run(dir, ["change", "tick", "0001-hub", "--all"]).status, 0);

    const check = run(dir, ["change", "check", "0001-hub"]);
    assert.doesNotMatch(check.stdout + check.stderr, /alters a documented surface/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the Verification section names what you RUN, not what you change", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "mudar alguma coisa", "--id", "0001-x",
      "--title", "x", "--quiet"]).status, 0);
    const p = proposalOf(dir, "0001-x");
    writeSection(p, "## What", ["Prosa sem comando nenhum."]);
    writeSection(p, "## Verification", ["- [ ] `doctrina coverage --strict` fica verde."]);
    const signals = documentedSurfaceSignals(changeDir(dir, "0001-x"), dir);
    assert.ok(!signals.some((s) => /commands:/.test(s)),
      `Verification leaked a command signal: ${JSON.stringify(signals)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a product change that names a command in What still signals", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["work", "mudar alguma coisa", "--id", "0001-x",
      "--title", "x", "--quiet"]).status, 0);
    writeSection(proposalOf(dir, "0001-x"), "## What",
      ["O `doctrina coverage` passa a aceitar `--only <cap>`."]);
    const signals = documentedSurfaceSignals(changeDir(dir, "0001-x"), dir);
    assert.ok(signals.some((s) => /commands: .*coverage/.test(s)),
      `a real surface change stopped signalling: ${JSON.stringify(signals)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("this repository's archived changes keep their signals", () => {
  // The regression that would matter: making the gate inert. Every archived
  // PRODUCT change that named a command must still name it.
  const base = path.join(repoRoot, ".doctrina", "changes", "archive");
  const dirs = readdirSync(base).filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d));
  let product = 0;
  let signalling = 0;
  for (const d of dirs) {
    const p = path.join(base, d, "proposal.md");
    let text;
    try {
      text = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    if (/chore/i.test((text.match(/^-\s+\*\*Lane:\*\*\s*(.*)$/m) ?? ["", ""])[1])) continue;
    product += 1;
    if (documentedSurfaceSignals(path.join(base, d), repoRoot).length > 0) signalling += 1;
  }
  assert.ok(product > 50, "the archive should carry a real sample");
  assert.ok(signalling / product > 0.8,
    `the gate went quiet on product changes: ${signalling}/${product} still signal`);
});

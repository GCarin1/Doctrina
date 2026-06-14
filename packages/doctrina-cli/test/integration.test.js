import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function runCli(args, { cwd } = {}) {
  return spawnSync("node", [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function makeTempProject() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-test-"));
  return tmp;
}

test("init with --non-interactive creates AGENTS.md and .doctrina/", () => {
  const tmp = makeTempProject();
  try {
    const r = runCli(
      ["init", "--non-interactive", "--project-name", "Acme", "--project-description", "Test project"],
      { cwd: tmp },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.ok(existsSync(path.join(tmp, "AGENTS.md")));
    assert.ok(existsSync(path.join(tmp, ".doctrina", "product.md")));
    assert.ok(existsSync(path.join(tmp, ".doctrina", "index.json")));
    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    assert.equal(index.project, "Acme");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("init refuses to overwrite without --force", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "A"], { cwd: tmp });
    const second = runCli(["init", "--non-interactive", "--project-name", "B"], { cwd: tmp });
    assert.equal(second.status, 1);
    assert.match(second.stderr, /already exists/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("init --agent all installs every supported adapter file", () => {
  const tmp = makeTempProject();
  try {
    const r = runCli(
      ["init", "--non-interactive", "--project-name", "Acme", "--agent", "all"],
      { cwd: tmp },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);
    // Codex has no file (reads AGENTS.md natively); the other seven do.
    const expectedFiles = [
      "CLAUDE.md",
      ".cursor/rules/00-doctrina.mdc",
      ".github/copilot-instructions.md",
      "GEMINI.md",
      "CONVENTIONS.md",
      ".windsurfrules",
      ".continue/rules/00-doctrina.md",
    ];
    for (const f of expectedFiles) {
      assert.ok(existsSync(path.join(tmp, f)), `expected ${f} to exist`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("init --agent claude installs CLAUDE.md adapter", () => {
  const tmp = makeTempProject();
  try {
    const r = runCli(
      ["init", "--non-interactive", "--project-name", "Acme", "--agent", "claude"],
      { cwd: tmp },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.ok(existsSync(path.join(tmp, "CLAUDE.md")));
    const content = readFileSync(path.join(tmp, "CLAUDE.md"), "utf8");
    assert.match(content, /@AGENTS\.md/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("spec new adds entry to index.json", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["spec", "new", "billing"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const spec = readFileSync(path.join(tmp, ".doctrina", "specs", "billing", "spec.md"), "utf8");
    assert.match(spec, /Capability:\*\*\s+billing/);
    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    assert.ok(index.artifacts.specs.find((s) => s.id === "billing"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("change new + apply + archive round-trip", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const open = runCli(["change", "new", "0001", "first change"], { cwd: tmp });
    assert.equal(open.status, 0, open.stderr || open.stdout);
    assert.ok(existsSync(path.join(tmp, ".doctrina", "changes", "0001", "proposal.md")));

    // Hand-author an ADDED delta for a new capability
    const deltaPath = path.join(tmp, ".doctrina", "changes", "0001", "specs", "core", "delta.md");
    mkdirSync(path.dirname(deltaPath), { recursive: true });
    writeFileSync(
      deltaPath,
      "# Spec Delta — capability: core\n\n**Operation:** ADDED\n**Target spec on apply:** `.doctrina/specs/core/spec.md`\n\n---\n\n# Spec — Core\n\nbody\n",
    );

    const apply = runCli(["change", "apply", "0001"], { cwd: tmp });
    assert.equal(apply.status, 0, apply.stderr || apply.stdout);
    assert.ok(existsSync(path.join(tmp, ".doctrina", "specs", "core", "spec.md")));
    const proposalAfterApply = readFileSync(path.join(tmp, ".doctrina", "changes", "0001", "proposal.md"), "utf8");
    assert.match(proposalAfterApply, /\*\*Status:\*\*\s+applied/);
    assert.match(proposalAfterApply, /\*\*Applied:\*\*\s+\d{4}-\d{2}-\d{2}/);

    const archive = runCli(["change", "archive", "0001"], { cwd: tmp });
    assert.equal(archive.status, 0, archive.stderr || archive.stdout);
    assert.ok(!existsSync(path.join(tmp, ".doctrina", "changes", "0001")));

    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    assert.equal(index.artifacts.changes.length, 0);
    assert.equal(index.artifacts.changes_archive.length, 1);
    assert.ok(index.artifacts.specs.find((s) => s.id === "core"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("change apply with zero deltas still flips proposal to applied", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const open = runCli(["change", "new", "0001-metadata", "metadata only"], { cwd: tmp });
    assert.equal(open.status, 0, open.stderr || open.stdout);
    const apply = runCli(["change", "apply", "0001-metadata"], { cwd: tmp });
    assert.equal(apply.status, 0, apply.stderr || apply.stdout);
    assert.match(apply.stdout, /no spec deltas/);
    const proposal = readFileSync(
      path.join(tmp, ".doctrina", "changes", "0001-metadata", "proposal.md"),
      "utf8",
    );
    assert.match(proposal, /\*\*Status:\*\*\s+applied/);
    assert.match(proposal, /\*\*Applied:\*\*\s+\d{4}-\d{2}-\d{2}/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("hooks install writes an executable pre-commit hook", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    // bootstrap a fake git dir
    mkdirSync(path.join(tmp, ".git", "hooks"), { recursive: true });
    const r = runCli(["hooks", "install"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const hookPath = path.join(tmp, ".git", "hooks", "pre-commit");
    assert.ok(existsSync(hookPath));
    if (process.platform !== "win32") {
      const mode = statSync(hookPath).mode & 0o777;
      assert.ok(mode & 0o100, `expected executable bit, got ${mode.toString(8)}`);
    }
    const body = readFileSync(hookPath, "utf8");
    assert.match(body, /doctrina validate/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("hooks install fails outside a git repository", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["hooks", "install"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not a git repository/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("hooks install refuses to overwrite without --force", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    mkdirSync(path.join(tmp, ".git", "hooks"), { recursive: true });
    runCli(["hooks", "install"], { cwd: tmp });
    const r = runCli(["hooks", "install"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /already exists/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate warns on oversized capability spec", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "fat"], { cwd: tmp });
    // Append many lines to the spec to cross the 400-line cap
    const specPath = path.join(tmp, ".doctrina", "specs", "fat", "spec.md");
    const padding = "\n" + "padding line\n".repeat(450);
    writeFileSync(specPath, readFileSync(specPath, "utf8") + padding);
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0); // warnings only
    assert.match(r.stdout, /soft cap/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate warns on orphan spec (file present, not in index)", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    // Hand-create a spec directory bypassing the CLI so the index does not know
    const dir = path.join(tmp, ".doctrina", "specs", "ghost");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "spec.md"), "# Spec — ghost\nbody\n");
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /orphan spec/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate errors on a non-canonical ADR filename", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    // Hand-create an ADR with the wrong filename shape (ADR-001-... instead
    // of 0001-...). The Status header is well-formed so only the filename
    // is at fault — the rest of the toolchain would silently ignore it.
    const dir = path.join(tmp, ".doctrina", "decisions");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "ADR-001-jwt.md"),
      "# ADR-001 — JWT\n\n- **Status:** accepted\n- **Date:** 2026-06-13\n",
    );
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /non-canonical ADR filename/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("analyze passes on a well-formed change", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["change", "new", "0001-good", "good change"], { cwd: tmp });
    const r = runCli(["analyze", "0001-good"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /ready to apply/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("analyze fails on a change missing a Why section", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["change", "new", "0001-bad", "bad change"], { cwd: tmp });
    // Strip the Why section from proposal.md
    const proposalPath = path.join(tmp, ".doctrina", "changes", "0001-bad", "proposal.md");
    const text = readFileSync(proposalPath, "utf8").replace(/## Why[\s\S]*?(?=## )/, "");
    writeFileSync(proposalPath, text);
    const r = runCli(["analyze", "0001-bad"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /missing "## Why"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("spec new --bug scaffolds the bug-shape template", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["spec", "new", "checkout", "--bug"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const body = readFileSync(path.join(tmp, ".doctrina", "specs", "checkout", "spec.md"), "utf8");
    assert.match(body, /## Current behaviour/);
    assert.match(body, /## Expected behaviour/);
    assert.match(body, /## Unchanged behaviour/);
    assert.match(body, /Type:\*\*\s+bug/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate warns on a stale Markdown link inside a spec", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });
    const specPath = path.join(tmp, ".doctrina", "specs", "billing", "spec.md");
    writeFileSync(
      specPath,
      readFileSync(specPath, "utf8") + "\n\nSee [dead link](./does/not/exist.md) for details.\n",
    );
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0); // warning only
    assert.match(r.stdout, /references missing path/);
    assert.match(r.stdout, /does\/not\/exist\.md/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("clarify exits 0 on a clean Markdown body", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const filePath = path.join(tmp, "clean.md");
    writeFileSync(
      filePath,
      "# Clean\n\nThe system shall enforce a quota of 100 requests per minute.\n\n## Acceptance criteria\n\n1. Returns HTTP 429 above 100 requests/min.\n",
    );
    const r = runCli(["clarify", "clean.md"], { cwd: tmp });
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /no smells found/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("clarify flags weasel words and placeholders", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const filePath = path.join(tmp, "smelly.md");
    writeFileSync(
      filePath,
      "# Smelly\n\nThe system might support quotas.\n\nSome requests will be throttled.\n\nTODO write more.\n",
    );
    const r = runCli(["clarify", "smelly.md"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /weasel "might"/);
    assert.match(r.stdout, /vague "Some"/i);
    assert.match(r.stdout, /placeholder "TODO"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("clarify flags empty Acceptance criteria section", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const filePath = path.join(tmp, "empty.md");
    writeFileSync(
      filePath,
      "# Empty\n\n## Acceptance criteria\n\n## Next\n\nMore content.\n",
    );
    const r = runCli(["clarify", "empty.md"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /empty-section "Acceptance criteria"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("templates list enumerates shipped templates", () => {
  const r = runCli(["templates", "list"]);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /AGENTS\.md\.template/);
  assert.match(r.stdout, /spec\.md\.template/);
  assert.match(r.stdout, /adapters\/claude\/CLAUDE\.md\.template/);
});

test("templates check flags a missing recommended section", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    // Strip the "## Conventions and boundaries" heading to provoke a finding
    const agentsPath = path.join(tmp, "AGENTS.md");
    const body = readFileSync(agentsPath, "utf8").replace(/^## Conventions and boundaries\b.*$/m, "<!-- stripped -->");
    writeFileSync(agentsPath, body);
    const r = runCli(["templates", "check"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /missing recommended section "## Conventions and boundaries"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("skill new scaffolds a skill with frontmatter and indexes it", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["skill", "new", "db-migration"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const body = readFileSync(path.join(tmp, ".doctrina", "skills", "db-migration.md"), "utf8");
    assert.match(body, /^---/);
    assert.match(body, /name: db-migration/);
    assert.match(body, /description:/);
    assert.match(body, /when:/);
    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    assert.ok(index.artifacts.skills?.find((s) => s.id === "db-migration"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("skill list enumerates skills with descriptions", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["skill", "new", "first-skill"], { cwd: tmp });
    runCli(["skill", "new", "second-skill"], { cwd: tmp });
    const r = runCli(["skill", "list"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /first-skill/);
    assert.match(r.stdout, /second-skill/);
    assert.match(r.stdout, /2 skills/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate flags a skill missing the description frontmatter", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const dir = path.join(tmp, ".doctrina", "skills");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "broken.md"),
      "---\nname: broken\nwhen: never\n---\n\nBody without description frontmatter.\n",
    );
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0); // warnings, not errors
    assert.match(r.stdout, /missing required frontmatter field "description"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("decision new creates next sequential ADR", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["decision", "new", "Adopt Postgres for primary store"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.ok(existsSync(path.join(tmp, ".doctrina", "decisions", "0001-adopt-postgres-for-primary-store.md")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("decision supersede rewrites old Status and links both ADRs", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["decision", "new", "Use SQLite for v0"], { cwd: tmp });
    const r = runCli(["decision", "supersede", "0001", "Use Postgres from v1"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const oldAdr = readFileSync(path.join(tmp, ".doctrina", "decisions", "0001-use-sqlite-for-v0.md"), "utf8");
    assert.match(oldAdr, /\*\*Status:\*\*\s+superseded by 0002/);
    assert.match(oldAdr, /\*\*Superseded by:\*\*\s+0002/);

    const newAdr = readFileSync(path.join(tmp, ".doctrina", "decisions", "0002-use-postgres-from-v1.md"), "utf8");
    assert.match(newAdr, /\*\*Supersedes:\*\*\s+0001/);

    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    const oldEntry = index.artifacts.decisions.find((d) => d.id === "0001");
    const newEntry = index.artifacts.decisions.find((d) => d.id === "0002");
    assert.equal(oldEntry.status, "superseded by 0002");
    assert.equal(oldEntry.superseded_by, "0002");
    assert.equal(newEntry.supersedes, "0001");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("decision supersede refuses an already-superseded ADR", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["decision", "new", "First take"], { cwd: tmp });
    runCli(["decision", "supersede", "0001", "Second take"], { cwd: tmp });
    const r = runCli(["decision", "supersede", "0001", "Third take"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /already superseded/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("change apply with a MODIFIED delta stays proposed and reports manual merge", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });
    runCli(["change", "new", "0001-tweak", "tweak billing"], { cwd: tmp });

    const deltaPath = path.join(tmp, ".doctrina", "changes", "0001-tweak", "specs", "billing", "delta.md");
    mkdirSync(path.dirname(deltaPath), { recursive: true });
    writeFileSync(
      deltaPath,
      "# Spec Delta — capability: billing\n\n**Operation:** MODIFIED\n**Target spec on apply:** `.doctrina/specs/billing/spec.md`\n\n---\n\nNew requirement text to merge by hand.\n",
    );

    const apply = runCli(["change", "apply", "0001-tweak"], { cwd: tmp });
    assert.equal(apply.status, 0, apply.stderr || apply.stdout);
    assert.match(apply.stdout, /manual\[MODIFIED\]/);

    // The target spec body is untouched and the proposal does not flip.
    const spec = readFileSync(path.join(tmp, ".doctrina", "specs", "billing", "spec.md"), "utf8");
    assert.ok(!spec.includes("New requirement text"));
    const proposal = readFileSync(path.join(tmp, ".doctrina", "changes", "0001-tweak", "proposal.md"), "utf8");
    assert.match(proposal, /\*\*Status:\*\*\s+proposed/);
    assert.ok(!/\*\*Applied:\*\*/.test(proposal));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("skill sync copies frontmatter description into index.json", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["skill", "new", "db-migration"], { cwd: tmp });
    // User fills in the frontmatter description by hand.
    const skillPath = path.join(tmp, ".doctrina", "skills", "db-migration.md");
    const edited = readFileSync(skillPath, "utf8").replace(
      /^description:.*$/m,
      "description: Run schema migrations safely with rollback steps",
    );
    writeFileSync(skillPath, edited);

    const r = runCli(["skill", "sync"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /1 skill synced/);

    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    const entry = index.artifacts.skills.find((s) => s.id === "db-migration");
    assert.equal(entry.description, "Run schema migrations safely with rollback steps");

    // Second run is a no-op.
    const again = runCli(["skill", "sync"], { cwd: tmp });
    assert.equal(again.status, 0);
    assert.match(again.stdout, /0 skills synced/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate warns when a skill description drifts from index.json", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["skill", "new", "deploy"], { cwd: tmp });
    const skillPath = path.join(tmp, ".doctrina", "skills", "deploy.md");
    const edited = readFileSync(skillPath, "utf8").replace(
      /^description:.*$/m,
      "description: Ship a release to production",
    );
    writeFileSync(skillPath, edited);
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0); // warning only
    assert.match(r.stdout, /description differs from index\.json/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate warns when a spec Version header drifts from index.json", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });
    const specPath = path.join(tmp, ".doctrina", "specs", "billing", "spec.md");
    const bumped = readFileSync(specPath, "utf8").replace(
      /^\*\*Version:\*\*\s+\S+/m,
      "**Version:** 0.2.0",
    );
    writeFileSync(specPath, bumped);
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0); // warning only
    assert.match(r.stdout, /declares version 0\.2\.0 but index\.json records/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("index rebuild syncs a drifted spec version and --check gates it", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });

    // Drift: bump the Version header on disk without touching the index.
    const specPath = path.join(tmp, ".doctrina", "specs", "billing", "spec.md");
    writeFileSync(specPath, readFileSync(specPath, "utf8").replace(/^\*\*Version:\*\*\s+\S+/m, "**Version:** 0.3.0"));

    const check = runCli(["index", "rebuild", "--check"], { cwd: tmp });
    assert.equal(check.status, 1);
    assert.match(check.stdout, /billing.*metadata differs/);

    const rebuild = runCli(["index", "rebuild"], { cwd: tmp });
    assert.equal(rebuild.status, 0, rebuild.stderr || rebuild.stdout);
    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    assert.equal(index.artifacts.specs.find((s) => s.id === "billing").version, "0.3.0");

    const clean = runCli(["index", "rebuild", "--check"], { cwd: tmp });
    assert.equal(clean.status, 0, clean.stdout);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("index rebuild adopts artifacts created outside the CLI", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const dir = path.join(tmp, ".doctrina", "specs", "ghost");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "spec.md"),
      "# Spec — Ghost\n\n**Capability:** ghost\n**Status:** active\n**Last updated:** 2026-06-10\n**Version:** 0.2.0\n\nbody\n",
    );
    const r = runCli(["index", "rebuild"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    const ghost = index.artifacts.specs.find((s) => s.id === "ghost");
    assert.ok(ghost);
    assert.equal(ghost.version, "0.2.0");
    assert.equal(ghost.last_updated, "2026-06-10");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("next walks the change lifecycle: tasks -> apply -> archive -> clear", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });

    // Fresh project: nothing open.
    let r = runCli(["next"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /no open work/);
    assert.match(r.stdout, /doctrina change new/);

    // Open change with unchecked tasks.
    runCli(["change", "new", "0001-x", "do x"], { cwd: tmp });
    r = runCli(["next"], { cwd: tmp });
    assert.match(r.stdout, /open task/);
    assert.match(r.stdout, /0001-x\/tasks\.md/);

    // Tasks done + a delta present: suggests analyze/apply.
    const tasksPath = path.join(tmp, ".doctrina", "changes", "0001-x", "tasks.md");
    writeFileSync(tasksPath, readFileSync(tasksPath, "utf8").replaceAll("- [ ]", "- [x]"));
    const deltaPath = path.join(tmp, ".doctrina", "changes", "0001-x", "specs", "core", "delta.md");
    mkdirSync(path.dirname(deltaPath), { recursive: true });
    writeFileSync(
      deltaPath,
      "# Spec Delta — capability: core\n\n**Operation:** ADDED\n**Target spec on apply:** `.doctrina/specs/core/spec.md`\n\n---\n\n# Spec — Core\n\nbody\n",
    );
    r = runCli(["next"], { cwd: tmp });
    assert.match(r.stdout, /doctrina change apply 0001-x/);

    // Applied but not archived.
    runCli(["change", "apply", "0001-x"], { cwd: tmp });
    r = runCli(["next"], { cwd: tmp });
    assert.match(r.stdout, /doctrina change archive 0001-x/);

    // Archived: clear again.
    runCli(["change", "archive", "0001-x"], { cwd: tmp });
    r = runCli(["next"], { cwd: tmp });
    assert.match(r.stdout, /no open work/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("next flags ADRs stuck in proposed status", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["decision", "new", "Adopt Postgres"], { cwd: tmp });
    const r = runCli(["next"], { cwd: tmp });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /review ADR 0001/);
    assert.match(r.stdout, /doctrina decision accept 0001, or supersede/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("change diff renders a unified diff for MODIFIED deltas", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });
    runCli(["change", "new", "0001-tweak", "tweak billing"], { cwd: tmp });

    const specPath = path.join(tmp, ".doctrina", "specs", "billing", "spec.md");
    writeFileSync(specPath, "# Spec — billing\n\nThe system shall bill monthly.\n");
    const deltaPath = path.join(tmp, ".doctrina", "changes", "0001-tweak", "specs", "billing", "delta.md");
    mkdirSync(path.dirname(deltaPath), { recursive: true });
    writeFileSync(
      deltaPath,
      "# Spec Delta — capability: billing\n\n**Operation:** MODIFIED\n**Target spec on apply:** `.doctrina/specs/billing/spec.md`\n\n---\n\nThe system shall bill weekly.\n",
    );

    const r = runCli(["change", "diff", "0001-tweak"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /MODIFIED .*billing\/spec\.md/);
    assert.match(r.stdout, /@@ /);
    assert.match(r.stdout, /\+The system shall bill weekly\./);
    assert.match(r.stdout, /-The system shall bill monthly\./);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("change diff summarises ADDED deltas without diffing", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["change", "new", "0001-add", "add core"], { cwd: tmp });
    const deltaPath = path.join(tmp, ".doctrina", "changes", "0001-add", "specs", "core", "delta.md");
    mkdirSync(path.dirname(deltaPath), { recursive: true });
    writeFileSync(
      deltaPath,
      "# Spec Delta — capability: core\n\n**Operation:** ADDED\n**Target spec on apply:** `.doctrina/specs/core/spec.md`\n\n---\n\n# Spec — Core\n\nbody\n",
    );
    const r = runCli(["change", "diff", "0001-add"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /ADDED .*core\/spec\.md \(\+\d+ lines\)/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("metrics derives counts from local git history and --save snapshots", () => {
  const tmp = makeTempProject();
  const gitEnv = ["-c", "user.email=t@example.com", "-c", "user.name=T", "-c", "commit.gpgsign=false"];
  const sh = (args) => spawnSync("git", [...gitEnv, ...args], { cwd: tmp, encoding: "utf8" });
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    sh(["init", "-q"]);
    writeFileSync(path.join(tmp, "a.txt"), "one\n");
    sh(["add", "."]);
    sh(["commit", "-q", "-m", "feat: first"]);
    writeFileSync(path.join(tmp, "a.txt"), "two\n");
    sh(["add", "."]);
    sh(["commit", "-q", "-m", "fix: second"]);
    sh(["commit", "-q", "--allow-empty", "-m", 'Revert "feat: first"']);

    const r = runCli(["metrics", "--since", "30"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /commits\s+3/);
    assert.match(r.stdout, /reverts\s+1/);
    assert.match(r.stdout, /re-edit rate/);
    assert.match(r.stdout, /top churn:/);

    const save = runCli(["metrics", "--since", "30", "--save"], { cwd: tmp });
    assert.equal(save.status, 0, save.stderr || save.stdout);
    const files = readFileSync(
      path.join(tmp, ".doctrina", "metrics", new Date().toISOString().slice(0, 10) + ".json"),
      "utf8",
    );
    const snap = JSON.parse(files);
    assert.equal(snap.commits, 3);
    assert.equal(snap.reverts, 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("metrics fails cleanly outside a git repository", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["metrics"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /not a git repository/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate flags EARS grammar-shape violations per section", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const dir = path.join(tmp, ".doctrina", "specs", "billing");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "spec.md"),
      [
        "# Spec — billing",
        "",
        "**Capability:** billing",
        "**Status:** active",
        "**Last updated:** 2026-06-11",
        "**Version:** 0.1.0",
        "",
        "## Requirements (EARS)",
        "",
        "### Ubiquitous",
        "",
        "- When a payment arrives, the system shall record it.",
        "- The system shall store amounts in cents.",
        "",
        "### Event-driven",
        "",
        "- The system records refunds.",
        "",
        "### Optional",
        "",
        "- Where webhooks are configured, the system may notify them.",
        "",
        "## Acceptance criteria",
        "",
        "1. Amounts round-trip without precision loss.",
        "",
      ].join("\n"),
    );
    runCli(["index", "rebuild"], { cwd: tmp });
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0); // warnings only
    assert.match(r.stdout, /event-shaped requirement.*move to ### Event-driven/);
    assert.match(r.stdout, /expected "When <trigger>, the system shall \.\.\."/);
    assert.ok(!/Optional:/.test(r.stdout), "well-formed Optional must not warn");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("change archive appends a one-line summary to the ledger", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });

    runCli(["change", "new", "0001-a", "first thing"], { cwd: tmp });
    const deltaPath = path.join(tmp, ".doctrina", "changes", "0001-a", "specs", "core", "delta.md");
    mkdirSync(path.dirname(deltaPath), { recursive: true });
    writeFileSync(
      deltaPath,
      "# Spec Delta — capability: core\n\n**Operation:** ADDED\n**Target spec on apply:** `.doctrina/specs/core/spec.md`\n\n---\n\n# Spec — Core\n\nbody\n",
    );
    runCli(["change", "apply", "0001-a"], { cwd: tmp });
    runCli(["change", "archive", "0001-a"], { cwd: tmp });

    const ledgerPath = path.join(tmp, ".doctrina", "changes", "archive", "LEDGER.md");
    assert.ok(existsSync(ledgerPath));
    let ledger = readFileSync(ledgerPath, "utf8");
    assert.match(ledger, /- \d{4}-\d{2}-\d{2} — 0001-a — first thing \(specs: core ADDED\)/);

    runCli(["change", "new", "0002-b", "second thing"], { cwd: tmp });
    runCli(["change", "apply", "0002-b"], { cwd: tmp });
    runCli(["change", "archive", "0002-b"], { cwd: tmp });
    ledger = readFileSync(ledgerPath, "utf8");
    assert.match(ledger, /0001-a — first thing/);
    assert.match(ledger, /0002-b — second thing/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("templates update previews by default and applies with --write", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const agentsPath = path.join(tmp, "AGENTS.md");
    writeFileSync(
      agentsPath,
      readFileSync(agentsPath, "utf8").replace(/^## Conventions and boundaries\b.*$/m, "<!-- stripped -->"),
    );

    const preview = runCli(["templates", "update"], { cwd: tmp });
    assert.equal(preview.status, 1);
    assert.match(preview.stdout, /would.*AGENTS\.md: append stub section "## Conventions and boundaries"/);
    assert.ok(!readFileSync(agentsPath, "utf8").includes("added by doctrina templates update"));

    const applied = runCli(["templates", "update", "--write"], { cwd: tmp });
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    const body = readFileSync(agentsPath, "utf8");
    assert.match(body, /## Conventions and boundaries\n\n<!-- added by doctrina templates update — fill in -->/);

    const check = runCli(["templates", "check"], { cwd: tmp });
    assert.equal(check.status, 0, check.stdout);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate applies size caps to nested AGENTS.md files", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const nestedDir = path.join(tmp, "services", "billing");
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(path.join(nestedDir, "AGENTS.md"), "line\n".repeat(210));
    let r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /services\/billing\/AGENTS\.md is 210 lines \(>200, hard limit\)/);

    writeFileSync(path.join(nestedDir, "AGENTS.md"), "line\n".repeat(160));
    r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /services\/billing\/AGENTS\.md is 160 lines \(>150 soft limit\)/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("context prints the read-order pack and lists skills on demand", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });
    runCli(["decision", "new", "Use Postgres"], { cwd: tmp });
    runCli(["decision", "accept", "0001"], { cwd: tmp });
    runCli(["skill", "new", "db-migration"], { cwd: tmp });

    const r = runCli(["context", "billing"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const out = r.stdout;
    // Read order: AGENTS.md before product.md before the spec before the ADR.
    const order = ["AGENTS.md", ".doctrina/product.md", "specs/billing/spec.md", "0001-use-postgres"]
      .map((needle) => out.indexOf(needle));
    assert.ok(order.every((i) => i >= 0), out);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), "pack must follow the read order");
    // Skills are on-demand: listed by name, body not in the pack.
    assert.match(out, /On-demand skills/);
    assert.match(out, /db-migration/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("context excludes non-accepted ADRs and --concat prints contents", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["decision", "new", "Still proposed"], { cwd: tmp });
    const r = runCli(["context"], { cwd: tmp });
    assert.equal(r.status, 0);
    assert.ok(!r.stdout.includes("still-proposed"), "proposed ADRs stay out of the pack");

    const concat = runCli(["context", "--concat"], { cwd: tmp });
    assert.equal(concat.status, 0);
    assert.match(concat.stdout, /===== AGENTS\.md \(root rules\) =====/);
    assert.match(concat.stdout, /===== \.doctrina\/product\.md/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("search finds terms grouped by category and exits 1 on no match", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });
    const specPath = path.join(tmp, ".doctrina", "specs", "billing", "spec.md");
    writeFileSync(specPath, readFileSync(specPath, "utf8") + "\nThe system shall support SAML single sign-on.\n");

    const hit = runCli(["search", "saml"], { cwd: tmp });
    assert.equal(hit.status, 0, hit.stderr || hit.stdout);
    assert.match(hit.stdout, /specs/);
    assert.match(hit.stdout, /billing\/spec\.md:\d+: The system shall support SAML/);

    const miss = runCli(["search", "kerberos"], { cwd: tmp });
    assert.equal(miss.status, 1);
    assert.match(miss.stdout, /no matches/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("spec list and decision list enumerate artifacts", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });
    runCli(["decision", "new", "Use Postgres"], { cwd: tmp });

    const specs = runCli(["spec", "list"], { cwd: tmp });
    assert.equal(specs.status, 0, specs.stderr || specs.stdout);
    assert.match(specs.stdout, /billing\s+0\.1\.0\s+active/);
    assert.match(specs.stdout, /1 spec/);

    const decisions = runCli(["decision", "list"], { cwd: tmp });
    assert.equal(decisions.status, 0, decisions.stderr || decisions.stdout);
    assert.match(decisions.stdout, /0001\s+proposed\s+\d{4}-\d{2}-\d{2}\s+Use Postgres/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("decision accept flips proposed to accepted and refuses anything else", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["decision", "new", "Use Postgres"], { cwd: tmp });

    const r = runCli(["decision", "accept", "0001"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const adr = readFileSync(path.join(tmp, ".doctrina", "decisions", "0001-use-postgres.md"), "utf8");
    assert.match(adr, /\*\*Status:\*\*\s+accepted/);
    const index = JSON.parse(readFileSync(path.join(tmp, ".doctrina", "index.json"), "utf8"));
    assert.equal(index.artifacts.decisions.find((d) => d.id === "0001").status, "accepted");

    const again = runCli(["decision", "accept", "0001"], { cwd: tmp });
    assert.equal(again.status, 1);
    assert.match(again.stderr, /not "proposed"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("clarify --all sweeps living documents in one pass", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const clean = runCli(["clarify", "--all"], { cwd: tmp });
    assert.equal(clean.status, 0, clean.stdout);
    assert.match(clean.stdout, /no smells in \d+ living document/);

    runCli(["spec", "new", "billing"], { cwd: tmp });
    const specPath = path.join(tmp, ".doctrina", "specs", "billing", "spec.md");
    writeFileSync(specPath, readFileSync(specPath, "utf8") + "\nThe system might support quotas. TODO decide.\n");
    const dirty = runCli(["clarify", "--all"], { cwd: tmp });
    assert.equal(dirty.status, 1);
    assert.match(dirty.stdout, /billing\/spec\.md:\d+: weasel "might"/);
    assert.match(dirty.stdout, /placeholder "TODO"/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("validate exits 0 on a fresh init", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["validate"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("--version prints something", () => {
  const r = runCli(["--version"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /\d+\.\d+\.\d+/);
});

test("unknown command exits 2", () => {
  const r = runCli(["nope"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown command/);
});

test("unknown command typo suggests a similar one", () => {
  const r = runCli(["valdiate"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /did you mean `doctrina validate`/);
});

test("unknown subcommand suggests a similar one", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["change", "aply", "0001"], { cwd: tmp });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /did you mean `doctrina change apply`/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("init --from copies AGENTS.md base content", () => {
  const tmp = makeTempProject();
  const conv = makeTempProject();
  try {
    writeFileSync(path.join(conv, "AGENTS.md"), "# House conventions\n\nUse uv.\nDo not touch /legacy.\n");
    const r = runCli(
      ["init", "--non-interactive", "--project-name", "Acme", "--from", conv],
      { cwd: tmp },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const body = readFileSync(path.join(tmp, "AGENTS.md"), "utf8");
    assert.match(body, /House conventions/);
    assert.match(body, /Project-specific/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(conv, { recursive: true, force: true });
  }
});

test("init --from with missing path errors out cleanly", () => {
  const tmp = makeTempProject();
  try {
    const r = runCli(
      ["init", "--non-interactive", "--project-name", "Acme", "--from", "/nonexistent/path"],
      { cwd: tmp },
    );
    assert.equal(r.status, 1);
    assert.match(r.stderr, /--from path is not a directory/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("intake <file> stores the description verbatim and prints the playbook", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    writeFileSync(path.join(tmp, "desc.md"), "Build a shop with login, catalog, and checkout.\n");
    const r = runCli(["intake", "desc.md"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const intake = readFileSync(path.join(tmp, ".doctrina", "intake.md"), "utf8");
    assert.match(intake, /\*\*Status:\*\*\s+pending/);
    assert.match(intake, /Build a shop with login, catalog, and checkout\./);
    assert.match(r.stdout, /Bootstrap playbook/);
    assert.match(r.stdout, /doctrina spec new <capability>/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("intake --text stores an inline description", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["intake", "--text", "A CLI that tracks habits."], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const intake = readFileSync(path.join(tmp, ".doctrina", "intake.md"), "utf8");
    assert.match(intake, /A CLI that tracks habits\./);
    assert.match(intake, /Source:\*\*\s+inline/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("intake reprints the playbook when pending and errors when absent", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const noneYet = runCli(["intake"], { cwd: tmp });
    assert.equal(noneYet.status, 1);
    assert.match(noneYet.stderr, /no intake found/);

    runCli(["intake", "--text", "thing"], { cwd: tmp });
    const reprint = runCli(["intake"], { cwd: tmp });
    assert.equal(reprint.status, 0, reprint.stderr || reprint.stdout);
    assert.match(reprint.stdout, /Bootstrap playbook/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("intake refuses to overwrite an existing intake without --force", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["intake", "--text", "first"], { cwd: tmp });
    const second = runCli(["intake", "--text", "second"], { cwd: tmp });
    assert.equal(second.status, 1);
    assert.match(second.stderr, /already exists/);
    const forced = runCli(["intake", "--text", "second", "--force"], { cwd: tmp });
    assert.equal(forced.status, 0, forced.stderr || forced.stdout);
    assert.match(readFileSync(path.join(tmp, ".doctrina", "intake.md"), "utf8"), /second/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("init --intake stores the intake and derives the one-line description", () => {
  const tmp = makeTempProject();
  try {
    writeFileSync(path.join(tmp, "desc.md"), "# Habit tracker\n\nDaily habits with streaks and reminders.\n");
    const r = runCli(
      ["init", "--non-interactive", "--project-name", "Habits", "--intake", "desc.md"],
      { cwd: tmp },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.ok(existsSync(path.join(tmp, ".doctrina", "intake.md")));
    // The heading mark is stripped; first non-empty line becomes the description.
    const agents = readFileSync(path.join(tmp, "AGENTS.md"), "utf8");
    assert.match(agents, /Habit tracker/);
    // The bootstrap playbook prints inline — no second command needed.
    assert.match(r.stdout, /Bootstrap playbook/);
    assert.match(r.stdout, /doctrina spec new <capability>/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("init scaffolds an AGENTS.md that tells the agent to auto-run the bootstrap", () => {
  const tmp = makeTempProject();
  try {
    const r = runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const agents = readFileSync(path.join(tmp, "AGENTS.md"), "utf8");
    assert.match(agents, /Working from intent/);
    assert.match(agents, /intake\.md.*Status:.*pending|Status:.*pending.*intake\.md/s);
    assert.match(agents, /doctrina intake/);
    assert.match(agents, /doctrina work/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("work derives a sequential id, records the prompt as Why, and prints the playbook", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["work", "add login with email and password"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const id = "0001-add-login-with-email-and-password";
    const proposalPath = path.join(tmp, ".doctrina", "changes", id, "proposal.md");
    assert.ok(existsSync(proposalPath), "change folder should be scaffolded");
    const proposal = readFileSync(proposalPath, "utf8");
    assert.match(proposal, /## Why\r?\n\r?\nadd login with email and password/);
    assert.match(r.stdout, /Work playbook — change 0001-add-login/);
    assert.match(r.stdout, /doctrina change apply 0001-add-login/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("work --capability pins the capability and stamps Affects specs", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "auth"], { cwd: tmp });
    const r = runCli(["work", "tighten password rules", "--capability", "auth"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /Capability \(pinned\): auth/);
    const proposal = readFileSync(
      path.join(tmp, ".doctrina", "changes", "0001-tighten-password-rules", "proposal.md"),
      "utf8",
    );
    assert.match(proposal, /\*\*Affects specs:\*\*\s+auth/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("work increments the change number across existing changes", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["work", "first task"], { cwd: tmp });
    const r = runCli(["work", "second task"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.ok(existsSync(path.join(tmp, ".doctrina", "changes", "0002-second-task")));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("work ranks an existing spec by term overlap as a hint", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["spec", "new", "billing"], { cwd: tmp });
    const specPath = path.join(tmp, ".doctrina", "specs", "billing", "spec.md");
    writeFileSync(specPath, readFileSync(specPath, "utf8") + "\nThe system shall handle invoice generation.\n");
    const r = runCli(["work", "fix invoice rounding"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /Likely capabilities/);
    assert.match(r.stdout, /billing\s+score/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("work requires a prompt", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    const r = runCli(["work"], { cwd: tmp });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /requires a prompt/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("next surfaces a pending intake before everything else", () => {
  const tmp = makeTempProject();
  try {
    runCli(["init", "--non-interactive", "--project-name", "Acme"], { cwd: tmp });
    runCli(["intake", "--text", "build the thing"], { cwd: tmp });
    let r = runCli(["next"], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /doctrina intake — a pending intake/);

    // Flip to converted: the intake action disappears.
    const intakePath = path.join(tmp, ".doctrina", "intake.md");
    writeFileSync(intakePath, readFileSync(intakePath, "utf8").replace("**Status:** pending", "**Status:** converted"));
    r = runCli(["next"], { cwd: tmp });
    assert.ok(!/pending intake/.test(r.stdout), "converted intake must not be flagged");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

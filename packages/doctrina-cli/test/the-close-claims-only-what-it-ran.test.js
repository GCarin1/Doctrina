import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// Change 0089 — the close claims only what it ran.
//
// The closing line was a fixed string: "— verified, archived, and validated."
// It printed on a close whose own step 7 had just said
//
//     skip   no .doctrina/verify.json — declare the real gate with ...
//
// so the run announced that the build gate had not executed and then reported
// the change as verified. It is the one sentence a human reads before
// approving.
//
// Two steps made the same shape of claim over nothing: "every touched spec's
// Implementation header matches its coverage" with ZERO specs, and "no
// accepted ADR cites the touched capabilities" with no ADR on disk. Both are
// vacuously true and both read as a check performed.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function run(cwd, args) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-close-"));
  assert.equal(run(dir, ["init", "--non-interactive", "--project-name", "Acme",
    "--intake-text", "uma carteira"]).status, 0);
  return dir;
}

// A planned change: prose written, one real task, boxes ticked.
function planned(dir, id, extra = []) {
  assert.equal(run(dir, ["work", "fazer alguma coisa", "--id", id, "--title", "x",
    "--quiet", ...extra]).status, 0);
  const p = path.join(dir, ".doctrina", "changes", id, "proposal.md");
  writeFileSync(p, readFileSync(p, "utf8")
    .replace("<!-- The shape of the change: artifacts created or modified, specs affected. -->", "Uma mudanca.")
    .replace("<!-- Anything adjacent that this change deliberately does NOT touch. -->", "Nada.")
    .replace("<!-- List unresolved decisions. Empty if none. -->", "- Nenhuma."));
  const t = path.join(dir, ".doctrina", "changes", id, "tasks.md");
  writeFileSync(t, readFileSync(t, "utf8").replace(/(?:^- \[ \][ \t]*\r?\n)+/m, "- [ ] Fazer.\n"));
  assert.equal(run(dir, ["change", "tick", id, "--all"]).status, 0);
}

const closingLine = (out) => out.split("\n").find((l) => /✓ change .* closed/.test(l)) ?? "";

test("a skipped verify is not reported as verified", () => {
  const dir = project();
  try {
    planned(dir, "0001-c", ["--chore"]);
    const out = run(dir, ["close", "0001-c"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /skip\s+no \.doctrina\/verify\.json/,
      "the fixture must actually skip verify");

    const line = closingLine(out.stdout);
    assert.doesNotMatch(line, /verified/, `the close claimed a gate it skipped: ${line}`);
    assert.match(line, /archived and validated/);
    assert.match(line, /Skipped: verify/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a step with nothing to check does not report conformance", () => {
  const dir = project();
  try {
    planned(dir, "0001-c", ["--chore"]);
    const out = run(dir, ["close", "0001-c"]).stdout;
    // No spec in the tree, no accepted ADR: neither may claim a check.
    assert.doesNotMatch(out, /ok every touched spec's Implementation header matches/);
    assert.match(out, /no spec to check — the change touches no capability/);
    assert.doesNotMatch(out, /ok no accepted ADR cites/);
    assert.match(out, /no accepted ADR in the tree/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("with something to check, the step says how much it checked", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["spec", "new", "carteira"]).status, 0);
    assert.equal(run(dir, ["index", "rebuild"]).status, 0);
    planned(dir, "0001-x", ["--capability", "carteira"]);
    const delta = path.join(dir, ".doctrina", "changes", "0001-x", "specs", "carteira", "delta.md");
    writeFileSync(delta, `${readFileSync(delta, "utf8").trimEnd()}\n\n\`\`\`ops\nappend-requirement ubiquitous: The system shall do the thing.\nbump-version patch\n\`\`\`\n`);

    const out = run(dir, ["close", "0001-x"]).stdout;
    assert.match(out, /Implementation header matches its coverage \(1 checked\)/,
      "a real check reports its size, so 'every' is never over nothing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a close that runs every gate still says all three words", () => {
  const dir = project();
  try {
    assert.equal(run(dir, ["verify", "--init"]).status, 0);
    const vj = path.join(dir, ".doctrina", "verify.json");
    const cfg = JSON.parse(readFileSync(vj, "utf8"));
    cfg.checks = [{ name: "noop", run: "node -e \"console.log(1)\"" }];
    writeFileSync(vj, `${JSON.stringify(cfg, null, 2)}\n`);

    planned(dir, "0001-c", ["--chore"]);
    const out = run(dir, ["close", "0001-c"]);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    const line = closingLine(out.stdout);
    assert.match(line, /verified, archived and validated/, line);
    assert.doesNotMatch(line, /Skipped/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the closing line never claims a word for a step that did not run", () => {
  // The property, stated directly: every word in the claim maps to a step,
  // and a step named as skipped can never also be claimed.
  const dir = project();
  try {
    planned(dir, "0001-c", ["--chore"]);
    const out = run(dir, ["close", "0001-c"]).stdout;
    const line = closingLine(out);
    const skipped = (line.match(/Skipped: (.*)\./) ?? ["", ""])[1].split(", ").filter(Boolean);
    const words = { verify: "verified", archive: "archived", validate: "validated" };
    for (const step of skipped) {
      const word = words[step];
      if (!word) continue;
      assert.doesNotMatch(line.split("Skipped")[0], new RegExp(word),
        `"${word}" is claimed while "${step}" is listed as skipped`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

// A CLOSE THAT STOPPED AFTER ITS APPLY CAN BE RERUN (change 0221).
//
// Closing change 0220 of this repository, the process was killed while
// `verify` ran the suite: the change was already `applied` and the new spec
// written. Rerunning the close asked the pre-apply question again — "the
// ADDED target already has real content" — which is the proof the apply
// worked, so the close could never finish. An applied change now resumes.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

test("an applied change resumes its close instead of failing the pre-apply check", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-resume-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  try {
    assert.equal(run(["init", "--non-interactive", "--project-name", "Acme", "--project-description", "x"]).status, 0);
    assert.equal(run(["change", "new", "0001-pagamento", "Pagamento"]).status, 0);
    const ch = path.join(dir, ".doctrina", "changes", "0001-pagamento");
    // Normalised first: a Windows checkout scaffolds with CRLF.
    const proposal = readFileSync(path.join(ch, "proposal.md"), "utf8").replace(/\r\n/g, "\n")
      .replace(/## Why\n\n[\s\S]*?\n## What/, "## Why\n\nO pagamento precisa de uma spec.\n\n## What")
      .replace(/<!-- The shape of the change[^>]*-->/, "- Spec `pagamento` nova.");
    writeFileSync(path.join(ch, "proposal.md"), proposal);
    writeFileSync(path.join(ch, "tasks.md"), "# Tasks\n\n- [x] Escrever a spec\n");
    mkdirSync(path.join(ch, "specs", "pagamento"), { recursive: true });
    writeFileSync(path.join(ch, "specs", "pagamento", "delta.md"), [
      "# Spec Delta — capability: pagamento", "", "**Operation:** ADDED",
      "**Target spec on apply:** `.doctrina/specs/pagamento/spec.md`", "", "---", "",
      "# Spec — Pagamento", "", "**Capability:** pagamento", "**Status:** draft", "**Implementation:** planned",
      "**Realizes:** n/a — exemplo", "**Last updated:** 2026-11-03", "**Version:** 0.1.0", "",
      "## Purpose", "", "Receber pagamentos.", "", "## Requirements (EARS)", "", "### Ubiquitous", "",
      "- The system shall record each payment.", "", "## Acceptance criteria", "",
      "1. [unverified] A payment is recorded.", "",
    ].join("\n"));
    assert.equal(run(["change", "apply", "0001-pagamento"]).status, 0, "the apply the killed close had done");
    const check = run(["change", "check", "0001-pagamento"]);
    assert.match(check.stdout, /has real content .*already applied — a pre-apply check, not asked again/);
    assert.doesNotMatch(check.stdout, /✗\s+pagamento \(ADDED\)/);
    const close = run(["close", "0001-pagamento"]);
    assert.match(close.stdout, /already applied — resuming/);
    assert.doesNotMatch(close.stdout, /close stopped at "(structure|apply)"/);
    assert.match(close.stdout, /already applied — nothing to do/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

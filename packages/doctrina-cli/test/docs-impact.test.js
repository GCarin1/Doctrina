import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { documentedSurfaceSignals } from "../src/lib/docs-impact.js";

// D2: a change that alters a documented surface must carry the docs for it.
// These cover the detection half (which is pure); the gate's git half and
// its --force behaviour are covered end-to-end in integration.test.js.

function makeChange({ proposal = "", delta = null } = {}) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "doctrina-impact-"));
  writeFileSync(path.join(tmp, "proposal.md"), proposal);
  if (delta) {
    mkdirSync(path.join(tmp, "specs", "cli"), { recursive: true });
    writeFileSync(path.join(tmp, "specs", "cli", "delta.md"), delta);
  }
  return tmp;
}

test("docs impact: a change naming a command is a documented surface", () => {
  const tmp = makeChange({
    proposal: "# Change\n\n## Why\n\nTeach `doctrina validate` a new check.\n",
  });
  try {
    const signals = documentedSurfaceSignals(tmp);
    assert.ok(signals.some((s) => s.startsWith("commands:")), signals.join("|"));
    assert.match(signals.join("|"), /validate/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs impact: a change naming a flag is a documented surface", () => {
  const tmp = makeChange({
    proposal: "# Change\n\n## Why\n\nAdd `--quiet` so backlog entry prints one line.\n",
  });
  try {
    const signals = documentedSurfaceSignals(tmp);
    assert.ok(signals.some((s) => s.startsWith("flags:")), signals.join("|"));
    assert.match(signals.join("|"), /--quiet/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs impact: exit-code changes are a documented surface", () => {
  const tmp = makeChange({
    proposal: "# Change\n\n## Why\n\nThe command now exits 3 when a precondition is missing.\n",
  });
  try {
    assert.ok(documentedSurfaceSignals(tmp).includes("exit codes"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs impact: a delta's command references count, not only the proposal", () => {
  const tmp = makeChange({
    proposal: "# Change\n\n## Why\n\nInternal tidy.\n",
    delta: "# Spec Delta — capability: cli\n\n**Operation:** MODIFIED\n\n---\n\nWhen `doctrina close` runs, it shall do X.\n",
  });
  try {
    assert.match(documentedSurfaceSignals(tmp).join("|"), /close/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs impact: prose about the framework is not a command reference", () => {
  // Bare prose, no code context: naming the project must not trip the gate,
  // or every change would demand docs and the gate would be ignored.
  const tmp = makeChange({
    proposal: "# Change\n\n## Why\n\nThe doctrina framework needs tidier internals.\n",
  });
  try {
    assert.deepEqual(documentedSurfaceSignals(tmp), []);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("docs impact: an empty change folder signals nothing", () => {
  const tmp = makeChange();
  try {
    assert.deepEqual(documentedSurfaceSignals(tmp), []);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

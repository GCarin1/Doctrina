// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMAND_META } from "../src/lib/commands.js";

// THE CYCLE HOLDS WHETHER OR NOT THE REQUEST NAMES THE FRAMEWORK (change 0213).
//
// A field review of an agent in Cursor listed what it skipped although
// AGENTS.md said it: `context` (it took `prime` as enough), `triage` (a step
// `work` already performs), naming the change to the human (the id lived
// only in the terminal), the project's skills (the editor never listed
// them), and one change per activity (two activities went into one). The
// hub states each in one line, and the always-applied Cursor rule carries
// the same cycle, because Cursor's per-prompt hook cannot.

const here = path.dirname(fileURLToPath(import.meta.url));
const templates = path.resolve(here, "..", "..", "..", ".doctrina", "templates");
const hub = readFileSync(path.join(templates, "AGENTS.md.template"), "utf8").replace(/\s+/g, " ");
const rule = readFileSync(path.join(templates, "adapters", "cursor", ".cursor", "rules", "00-doctrina.mdc.template"), "utf8").replace(/\s+/g, " ");

const CYCLE = [
  /BEFORE code is edited/,
  /`doctrina work "<request>"`/,
  /One change per activity|one change per activity/,
  /first sentence to the human/,
  /`doctrina context <cap> --for "<task>" --concat`/,
  /is (the project's )?state, not the spec/,
  /\.agents\/skills\//,
  /repeat the archive path it prints/,
];

test("the hub and the always-applied Cursor rule both state the whole cycle", () => {
  for (const line of CYCLE) {
    assert.match(hub, line, `AGENTS.md template: ${line}`);
    assert.match(rule, line, `Cursor rule: ${line}`);
  }
  assert.match(rule, /^---\s+description: .*\s+alwaysApply: true\s+---/);
});

test("the surface says work classifies the lane itself, and keeps triage for incidents", () => {
  assert.match(COMMAND_META.work.when, /BEFORE editing code; it classifies the lane itself/);
  assert.match(COMMAND_META.triage.when, /incident/);
  assert.doesNotMatch(COMMAND_META.work.when, /triage says/);
});

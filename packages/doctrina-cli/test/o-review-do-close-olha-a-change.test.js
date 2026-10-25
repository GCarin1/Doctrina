// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { rankCapabilitiesByDiff } from "../src/lib/work-model.js";

// THE REVIEW INSIDE A CLOSE LOOKS AT THE CHANGE (change 0200).
//
// A field review of 0.17 over 85 changes: "every close warns that the specs
// of health, squads, cloud… changed without an update, even when the change
// did not touch them." Two causes, both reproduced here:
//
//   1. The review runs before `apply`, and only an edited spec.md counted as
//      an update — so the capability the change was updating, through its
//      delta, was always reported stale.
//   2. Ownership summed every signal from every spec: a file claimed by
//      `health`'s `**Source:**` still belonged to `cloud` because cloud's
//      spec mentioned an `index.js`.

const here = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(here, "..", "src", "index.js");

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "doctrina-review-change-"));
  const run = (/** @type {string[]} */ args) => spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  const git = (/** @type {string[]} */ args) => execFileSync("git", args, { cwd: dir });
  git(["init", "-q"]);
  git(["config", "user.email", "t@example.com"]);
  git(["config", "user.name", "t"]);
  assert.equal(run(["init", "--non-interactive", "--project-name", "Acme"]).status, 0);
  for (const cap of ["health", "squads", "cloud"]) {
    mkdirSync(path.join(dir, "src", cap), { recursive: true });
    writeFileSync(path.join(dir, "src", cap, "index.js"), `export const ${cap} = 1;\n`);
    assert.equal(run(["spec", "new", cap]).status, 0);
    const spec = path.join(dir, ".doctrina", "specs", cap, "spec.md");
    writeFileSync(spec, readFileSync(spec, "utf8")
      .replace("**Last updated:**", `**Source:** \`src/${cap}/**\`\n**Last updated:**`)
      .replace("## Purpose", "## Purpose\n\nThe entry point is `index.js`.\n"));
  }
  assert.equal(run(["index", "rebuild"]).status, 0);
  git(["add", "-A"]);
  git(["commit", "-qm", "base"]);
  return { dir, run };
}

test("a file claimed by a Source belongs only to its declarer", () => {
  const { dir } = project();
  try {
    const owners = rankCapabilitiesByDiff(dir, ["src/health/index.js"], { limit: Infinity });
    assert.deepEqual(owners.map((o) => o.id), ["health"],
      "cloud and squads mention `index.js`, and that is not ownership");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("review --change counts the change's deltas as updates and folds the rest into one line", () => {
  const { dir, run } = project();
  try {
    assert.equal(run(["change", "new", "0001-health-version", "Health version"]).status, 0);
    const delta = path.join(dir, ".doctrina", "changes", "0001-health-version", "specs", "health", "delta.md");
    mkdirSync(path.dirname(delta), { recursive: true });
    writeFileSync(delta, "# Spec Delta — capability: health\n\n**Operation:** MODIFIED\n" +
      "**Target spec on apply:** `.doctrina/specs/health/spec.md`\n\n---\n\n```ops\nbump-version minor\n```\n");
    appendFileSync(path.join(dir, "src", "health", "index.js"), "export const version = 1;\n");
    // Other work lying in the tree.
    appendFileSync(path.join(dir, "src", "squads", "index.js"), "// wip\n");
    appendFileSync(path.join(dir, "src", "cloud", "index.js"), "// wip\n");

    const scoped = run(["review", "--change", "0001-health-version"]);
    assert.equal(scoped.status, 0, scoped.stderr);
    assert.doesNotMatch(scoped.stdout, /"health"/, "the change's own capability is being updated");
    const lines = scoped.stdout.split("\n").filter((l) => l.includes("✗") && /capabilit/.test(l));
    assert.equal(lines.length, 1, scoped.stdout);
    assert.match(lines[0], /2 capabilities this change carries no delta for: "cloud", "squads"/);

    // Without the change, the review keeps its per-capability form.
    const plain = run(["review"]);
    assert.equal(plain.stdout.split("\n").filter((l) => /spec was not updated/.test(l)).length, 3, plain.stdout);

    assert.equal(run(["review", "--change", "9999-nope"]).status, 2);
    assert.equal(run(["review", "--change", "../x"]).status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("close runs the review scoped to the change it closes", () => {
  const src = readFileSync(path.resolve(here, "..", "src", "commands", "close.js"), "utf8");
  assert.match(src, /review\.run\(\[\], new Map\(\[\["change", id\]\]\)\)/);
});

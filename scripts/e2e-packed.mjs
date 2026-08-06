#!/usr/bin/env node
// End-to-end harness that runs the CLI the way a USER installs it (M6).
//
// The unit and integration suites run the CLI from its own repository,
// where `locateTemplatesDir()` resolves to Doctrina's own `.doctrina/`,
// where every adapter is already present and linted, and where
// `index.json` is the repo's own rather than one `init` just wrote.
//
// Three audit defects were invisible from that vantage point and obvious
// from a packed install:
//
//   C1 — adding an adapter destroyed AGENTS.md and product.md
//   C2 — a fresh `init --agent claude` failed the CLI's own templates check
//   C5 — `init` wrote an index.json that `templates update` immediately
//        wanted to change
//
// So: pack the tarball, install it into a scratch directory OUTSIDE the
// repo, and drive a real project through the whole lifecycle with the
// installed binary. Everything below runs against `node_modules/.bin`,
// never against `src/`.
//
// Usage:
//   node scripts/e2e-packed.mjs            # full run
//   node scripts/e2e-packed.mjs --quick    # skip the per-adapter sweep

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";

// --repo <path> points the harness at ANOTHER checkout. That is how the
// acceptance criterion is met: run this harness against the commit before
// the fixes and watch it reproduce C1, C2 and C5.
const repoFlag = process.argv.indexOf("--repo");
const repoRoot = repoFlag >= 0
  ? path.resolve(process.argv[repoFlag + 1])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = path.join(repoRoot, "packages", "doctrina-cli");
const quick = process.argv.includes("--quick");

const ADAPTERS = [
  "claude", "codex", "cursor", "copilot", "gemini", "aider",
  "windsurf", "continue", "amp", "devin", "factory", "jules",
];

let failures = 0;
let checks = 0;

function ok(what) {
  checks += 1;
  console.log(`  ✓ ${what}`);
}

function fail(what, detail) {
  checks += 1;
  failures += 1;
  console.log(`  ✗ ${what}`);
  if (detail) console.log(String(detail).split("\n").map((l) => `      ${l}`).join("\n"));
}

function assert(cond, what, detail) {
  if (cond) ok(what);
  else fail(what, detail);
}

function run(cmd, args, cwd, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd, encoding: "utf8", shell: process.platform === "win32",
    env: { ...process.env, NO_COLOR: "1" },
    ...opts,
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", out: (r.stdout ?? "") + (r.stderr ?? "") };
}

// ---------------------------------------------------------------- setup

console.log("Doctrina end-to-end (packed install)\n");

const scratch = mkdtempSync(path.join(os.tmpdir(), "doctrina-e2e-"));
console.log(`scratch: ${scratch}\n`);

console.log("1. pack");
const pack = run("npm", ["pack", "--pack-destination", scratch], pkgDir);
if (pack.status !== 0) {
  console.error("npm pack failed:\n" + pack.out);
  process.exit(1);
}
const tarball = pack.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
const tarballPath = path.join(scratch, path.basename(tarball));
assert(existsSync(tarballPath), `packed ${path.basename(tarballPath)}`);

console.log("2. install into a scratch project (outside the repo)");
const installRoot = path.join(scratch, "install");
mkdirSync(installRoot, { recursive: true });
writeFileSync(path.join(installRoot, "package.json"), JSON.stringify({ name: "e2e-host", private: true }, null, 2));
const install = run("npm", ["install", "--no-audit", "--no-fund", tarballPath], installRoot);
if (install.status !== 0) {
  console.error("npm install failed:\n" + install.out);
  process.exit(1);
}
const bin = path.join(installRoot, "node_modules", ".bin", "doctrina");
assert(existsSync(bin) || existsSync(`${bin}.cmd`), "installed the doctrina binary");

// Every call below goes through the INSTALLED binary.
const doctrina = (args, cwd) => run(bin, args, cwd);

const version = doctrina(["--version"], installRoot);
assert(version.status === 0 && /^\d+\.\d+\.\d+/.test(version.stdout.trim()),
  `installed CLI reports version ${version.stdout.trim()}`, version.out);

// ------------------------------------------------- full lifecycle, one project

console.log("\n3. full lifecycle in a real project");
const proj = path.join(scratch, "project");
mkdirSync(proj, { recursive: true });
run("git", ["init", "-q"], proj);
run("git", ["config", "user.email", "e2e@example.com"], proj);
run("git", ["config", "user.name", "e2e"], proj);

const init = doctrina(["init", "--non-interactive", "--project-name", "Acme",
  "--project-description", "An end-to-end fixture project"], proj);
assert(init.status === 0, "doctrina init", init.out);

// C5's invariant: a project is born clean.
const freshUpdate = doctrina(["templates", "update"], proj);
assert(freshUpdate.status === 0, "a fresh project needs zero templates update operations", freshUpdate.out);

// Gates are green on an empty project.
for (const [label, args] of [
  ["validate", ["validate"]],
  ["templates check", ["templates", "check"]],
  ["doctor", ["doctor"]],
]) {
  const r = doctrina(args, proj);
  assert(r.status === 0, `${label} on a fresh project`, r.out);
}

// C8: history-reading commands survive a repo with no commits.
const metrics = doctrina(["metrics"], proj);
assert(metrics.status === 0 && !/fatal:/.test(metrics.out),
  "metrics on a repo with no commits", metrics.out);

// Drive a change end to end.
assert(doctrina(["spec", "new", "billing"], proj).status === 0, "spec new billing");
const work = doctrina(["work", "add refunds", "--capability", "billing", "--quiet"], proj);
assert(work.status === 0, "work --capability --quiet", work.out);

const changeId = "0001-add-refunds";
const deltaPath = path.join(proj, ".doctrina", "changes", changeId, "specs", "billing", "delta.md");
assert(existsSync(deltaPath), "work scaffolded a prefilled delta");
assert(/\*\*Operation:\*\* MODIFIED/.test(readFileSync(deltaPath, "utf8")),
  "the scaffolded delta prefills Operation: MODIFIED");

// Give the delta real ops and the spec real evidence.
writeFileSync(deltaPath, [
  "# Spec Delta — capability: billing",
  "",
  "**Operation:** MODIFIED",
  "**Target spec on apply:** `.doctrina/specs/billing/spec.md`",
  "",
  "---",
  "",
  "```ops",
  "bump-version minor",
  "set-header Status: active",
  "set-header Implementation: implemented",
  "set-header Realizes: n/a — fixture capability",
  "append-requirement event: When a refund is requested, the system shall record it.",
  "replace-criterion 1: [verified] Refunds are recorded — verified by `.doctrina/index.json`.",
  "```",
  "",
].join("\n"));

// C6: apply refuses while the change is unplanned.
const earlyApply = doctrina(["change", "apply", changeId], proj);
assert(earlyApply.status !== 0 && /\[structure\]/.test(earlyApply.out),
  "change apply refuses an unplanned change (gate parity)", earlyApply.out);

// Plan, tick, then close. Planning means BOTH files: real tasks in place of
// the placeholder boxes, and a proposal that says why the change exists and
// what it does. `analyze` refuses either left as scaffold, so a harness that
// filled only tasks.md would be driving a flow the framework rejects.
const tasksPath = path.join(proj, ".doctrina", "changes", changeId, "tasks.md");
writeFileSync(tasksPath, readFileSync(tasksPath, "utf8")
  .replace(/^(\s*-\s*\[[ xX]\])\s*$/gm, "$1 implement refunds"));

const proposalPath = path.join(proj, ".doctrina", "changes", changeId, "proposal.md");
writeFileSync(proposalPath, readFileSync(proposalPath, "utf8")
  .replace(/^(##[ \t]+Why[ \t]*)$/m, "$1\n\nCustomers need refunds on cancelled orders.")
  .replace(/^(##[ \t]+What[ \t]*)$/m, "$1\n\nA refunds endpoint and its spec delta."));
const planned = doctrina(["analyze", changeId], proj);
assert(planned.status === 0, "analyze passes once the proposal states why and what", planned.out);
assert(doctrina(["change", "tick", changeId, "--all"], proj).status === 0, "change tick --all");

const check = doctrina(["change", "check", changeId], proj);
assert(check.status === 0, "change check reports ready to close", check.out);

// The docs gate (D2) fires here: the change names commands and flags, and
// this fixture has no docs/ tree. --force is the documented escape, and
// exercising it proves the gap is recorded.
const close = doctrina(["close", changeId, "--force"], proj);
assert(close.status === 0, "close drives the whole sequence", close.out);
assert(/change .* closed/.test(close.out), "close reports the change closed", close.out);

const archived = path.join(proj, ".doctrina", "changes", "archive");
assert(existsSync(archived) && readFileSync(path.join(archived, "LEDGER.md"), "utf8").includes(changeId),
  "the archived change is in the ledger");

const specText = readFileSync(path.join(proj, ".doctrina", "specs", "billing", "spec.md"), "utf8");
assert(/\*\*Version:\*\* 0\.2\.0/.test(specText), "the ops block bumped the spec version");
assert(/When a refund is requested/.test(specText), "the EARS requirement was appended");

// Gates still green after the lifecycle.
for (const [label, args] of [
  ["validate", ["validate"]],
  ["index rebuild --check", ["index", "rebuild", "--check"]],
  ["templates check", ["templates", "check"]],
  ["doctor", ["doctor"]],
]) {
  const r = doctrina(args, proj);
  assert(r.status === 0, `${label} after the lifecycle`, r.out);
}

// ---------------------------------------------------- C1: content safety

console.log("\n4. adapters never destroy project content (C1)");
const agentsPath = path.join(proj, "AGENTS.md");
const productPath = path.join(proj, ".doctrina", "product.md");
writeFileSync(agentsPath, readFileSync(agentsPath, "utf8") + "\nCUSTOM RULE: never use float for money\n");
writeFileSync(productPath, readFileSync(productPath, "utf8") + "\n## Vision\n\nReal product vision.\n");
const agentsBefore = readFileSync(agentsPath);
const productBefore = readFileSync(productPath);

const add = doctrina(["adapter", "add", "gemini"], proj);
assert(add.status === 0, "adapter add gemini", add.out);
assert(Buffer.compare(readFileSync(agentsPath), agentsBefore) === 0, "AGENTS.md is byte-identical after adapter add");
assert(Buffer.compare(readFileSync(productPath), productBefore) === 0, "product.md is byte-identical after adapter add");

const destructive = doctrina(["init", "--agent", "gemini", "--force", "--non-interactive"], proj);
assert(destructive.status !== 0, "init --force refuses to overwrite authored content", destructive.out);
assert(Buffer.compare(readFileSync(agentsPath), agentsBefore) === 0, "AGENTS.md survives a refused init --force");
assert(Buffer.compare(readFileSync(productPath), productBefore) === 0, "product.md survives a refused init --force");

// ------------------------------------------------- C2: every adapter is clean

if (!quick) {
  console.log("\n5. every adapter passes the CLI's own checks (C2)");
  for (const agent of ADAPTERS) {
    const p = path.join(scratch, `adapter-${agent}`);
    mkdirSync(p, { recursive: true });
    const i = doctrina(["init", "--non-interactive", "--project-name", agent,
      "--project-description", "adapter fixture", "--agent", agent], p);
    if (i.status !== 0) {
      fail(`init --agent ${agent}`, i.out);
      continue;
    }
    const tc = doctrina(["templates", "check"], p);
    assert(tc.status === 0, `init --agent ${agent} then templates check`, tc.out);
  }
} else {
  console.log("\n5. per-adapter sweep skipped (--quick)");
}

// ---------------------------------------------------------------- report

console.log("");
if (failures === 0) {
  console.log(`ok  ${checks} checks passed against a packed install`);
} else {
  console.log(`fail  ${failures} of ${checks} checks failed against a packed install`);
}
rmSync(scratch, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);

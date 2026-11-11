// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// THE SECURITY POLICY DESCRIBES THE CLI THAT EXISTS (change 0248).
//
// SECURITY.md said the CLI runs six read-only git queries and writes only
// inside the working directory and `.git/hooks/` — and listed "a path the
// CLI writes outside the project working directory" as a security issue.
// The workspace (0.20) writes a registry under the home directory, links
// into other repositories and their `.git/info/exclude`, and runs
// `git init`; `hooks install` (0.22) writes git config. By its own
// definition the document described a different tool. Nothing compared it
// with the code, so nothing noticed for five releases.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const src = path.resolve(here, "..", "src");
const policy = readFileSync(path.join(repo, "SECURITY.md"), "utf8");

function sources(dir = src, out = /** @type {string[]} */ ([])) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}
const code = sources().map((p) => readFileSync(p, "utf8")).join("\n");

/** The posture bullet that begins with `title`, down to the next bullet or heading. */
function bullet(title) {
  const from = policy.indexOf(`- **${title}`);
  assert.ok(from >= 0, `SECURITY.md has no "${title}" commitment`);
  const rest = policy.slice(from + 4);
  const end = rest.search(/\n- \*\*|\n## /);
  return rest.slice(0, end < 0 ? undefined : end);
}

test("every git subcommand the CLI runs is named by the policy, and none it names is unused", () => {
  const used = new Set();
  for (const m of code.matchAll(/(?:\bgit|runGit|gitLines)\(\s*[^,()]+,\s*\[\s*"([a-z-]+)"/g)) used.add(m[1]);
  assert.ok(used.size >= 10, `the scan found the call sites (${[...used].join(", ")})`);
  const text = bullet("Subprocesses are `git`");
  const named = new Set([...text.matchAll(/`([a-z]+(?:-[a-z]+)*)`/g)].map((m) => m[1]));
  for (const sub of used) assert.ok(named.has(sub), `the CLI runs \`git ${sub}\`, and SECURITY.md does not name it`);
  const listed = text.slice(text.indexOf("to read:"), text.indexOf("The\n  `checks[].run`"));
  for (const m of listed.matchAll(/`([a-z]+(?:-[a-z]+)*)`/g)) {
    assert.ok(used.has(m[1]), `SECURITY.md names \`git ${m[1]}\`, and the CLI does not run it`);
  }
});

test("git is reached through one door, as an argument array", () => {
  for (const file of sources()) {
    const rel = path.relative(src, file).split(path.sep).join("/");
    if (rel === "lib/git.js") continue;
    assert.doesNotMatch(readFileSync(file, "utf8"), /spawn(Sync)?\(\s*["']git["']/, `${rel} spawns git itself`);
  }
  assert.doesNotMatch(readFileSync(path.join(src, "lib", "git.js"), "utf8"), /shell:\s*true/);
});

test("what the code writes or reads outside the project is what the policy lists", () => {
  const boundary = bullet("Filesystem boundary.");
  const reads = bullet("What it reads outside the project.");
  /** @type {[RegExp, string, string][]} */
  const claims = [
    [/DOCTRINA_HOME/, boundary, "`$DOCTRINA_HOME`"],
    [/info\/exclude/, boundary, "`.git/info/exclude`"],
    [/symlinkSync|linkSync/, boundary, "links"],
    [/merge\.\$\{MERGE_DRIVER\}|"config"/, boundary, "`.git/config`"],
    [/os\.tmpdir\(\)/, boundary, "temporary directory"],
    [/DOCTRINA_USAGE_LOG/, boundary, "`DOCTRINA_USAGE_LOG`"],
    [/\.claude\.json/, reads, "`~/.claude.json`"],
    [/env\.PATH/, reads, "`PATH`"],
  ];
  for (const [inCode, section, said] of claims) {
    assert.match(code, inCode, `precondition: the code still does this (${said})`);
    assert.ok(section.includes(said), `the code does it, and the policy does not say ${said}`);
  }
  assert.doesNotMatch(code, /from "node:(https?|net|dns|dgram|tls)"/, "no network module is imported");
  assert.match(policy, /It is a guardrail for an\s+agent that follows its hooks, not a sandbox/);
});

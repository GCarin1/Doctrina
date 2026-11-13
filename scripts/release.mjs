// @ts-check
// The mechanical half of a release (change 0245).
//
//   node scripts/release.mjs 0.22.0     write every stamp that quotes the version
//   node scripts/release.mjs --check    exit 1 when one of them disagrees
//
// The version lives in packages/doctrina-cli/package.json and is quoted in
// nine other places. Two releases in three days failed on that list being
// kept in a person's head: the tag went on the wrong commit, and the
// examples' indexes stayed one version behind. What a person still writes is
// what only a person can: the changelog's prose and the five lines an agent
// reads in AGENTS.md (`AGENT_CHANGELOG` in src/lib/commands.js).
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (/** @type {string[]} */ ...p) => path.join(repo, ...p);
const read = (/** @type {string} */ rel) => readFileSync(at(rel), "utf8");
const cli = at("packages", "doctrina-cli", "src", "index.js");
const PKG = "packages/doctrina-cli/package.json";

const minorOf = (/** @type {string} */ v) => v.split(".").slice(0, 2).join(".");
const examples = () => readdirSync(at("examples")).filter((d) => existsSync(at("examples", d, ".doctrina", "index.json")));

/**
 * Every place that quotes the version: what it holds now, and how to write it.
 * @param {string} version
 * @returns {{ file: string, what: string, wants: string, holds: () => string | null, write?: () => void }[]}
 */
export function stamps(version) {
  const line = (/** @type {string} */ file, /** @type {RegExp} */ re, /** @type {string} */ what, /** @type {(v: string) => string} */ value = (v) => v) => ({
    file, what,
    holds: () => read(file).match(re)?.[2] ?? null,
    write: () => writeFileSync(at(file), read(file).replace(re, (_m, before, _old, after) => before + value(version) + after)),
    wants: value(version),
  });
  const json = (/** @type {string} */ file, /** @type {(d: any) => any} */ get, /** @type {((d: any) => void) | null} */ set, /** @type {string} */ what) => ({
    file, what, wants: version,
    holds: () => get(JSON.parse(read(file))) ?? null,
    write: set ? () => {
      const data = JSON.parse(read(file));
      set(data);
      writeFileSync(at(file), JSON.stringify(data, null, 2) + "\n");
    } : undefined,
  });
  const rebuilt = (/** @type {string} */ dir) => ({
    ...json(path.posix.join(dir, ".doctrina/index.json"), (d) => d.framework_version, null, "the index stamp"),
    write: () => { spawnSync(process.execPath, [cli, "index", "rebuild"], { cwd: at(dir), stdio: "ignore" }); },
  });
  return [
    json(PKG, (d) => d.version, (d) => { d.version = version; }, "the version itself"),
    json("package-lock.json", (d) => d.packages?.["packages/doctrina-cli"]?.version, (d) => { d.packages["packages/doctrina-cli"].version = version; }, "the lockfile's copy"),
    line("README.md", /(\*\*Status:\*\* v)(\d+\.\d+\.\d+)( — released\.)/, "the status line"),
    line("README.pt.md", /(\*\*Status:\*\* v)(\d+\.\d+\.\d+)( — lançado\.)/, "the status line"),
    line("packages/doctrina-cli/README.md", /(\*\*Status:\*\* v)(\d+\.\d+\.\d+)( — current release)/, "the status line"),
    line("SECURITY.md", /(\| `)(\d+\.\d+)(\.x` \| yes)/, "the supported minor", minorOf),
    line("SECURITY.md", /(\| `< )(\d+\.\d+)(` \| no)/, "the unsupported range", minorOf),
    line("AGENTS.md", /(## What changed in )(\d+\.\d+\.\d+)(\n)/, "the agents' changelog heading"),
    rebuilt("."),
    ...examples().map((d) => rebuilt(path.posix.join("examples", d))),
  ];
}

/** What still disagrees with `version`, one line each. */
export function disagreements(version) {
  const out = [];
  for (const s of stamps(version)) {
    const holds = s.holds();
    if (holds !== s.wants) out.push(`${s.file}: ${s.what} is ${holds ?? "missing"}, expected ${s.wants}`);
  }
  if (!new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] — \\d{4}-\\d{2}-\\d{2}$`, "m").test(read("CHANGELOG.md"))) {
    out.push(`CHANGELOG.md: no \`## [${version}] — YYYY-MM-DD\` heading`);
  }
  return out;
}

async function main(argv) {
  const current = JSON.parse(read(PKG)).version;
  if (argv[0] === "--check") {
    const found = disagreements(current);
    for (const f of found) console.error(`✗ ${f}`);
    if (found.length > 0) {
      console.error(`\n${found.length} stamp${found.length === 1 ? "" : "s"} behind ${current} — \`node scripts/release.mjs ${current}\` writes them`);
      return 1;
    }
    console.log(`ok every stamp quotes ${current}`);
    return 0;
  }
  const version = argv[0];
  if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
    console.error("usage: node scripts/release.mjs <X.Y.Z> | --check");
    return 2;
  }
  // The five lines an agent reads are written by a person, before anything is stamped.
  const { AGENT_CHANGELOG } = await import(pathToCommands());
  if (!AGENT_CHANGELOG[version]) {
    console.error(`✗ no AGENT_CHANGELOG["${version}"] in packages/doctrina-cli/src/lib/commands.js — write what an agent must now do (at most five lines), then rerun`);
    console.error("  a draft: node packages/doctrina-cli/src/index.js status --view agent-changelog");
    return 1;
  }
  const changelog = read("CHANGELOG.md");
  if (!changelog.includes(`## [${version}]`)) {
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(at("CHANGELOG.md"), changelog.replace("## [Unreleased]\n", `## [Unreleased]\n\n## [${version}] — ${today}\n`));
    console.log(`CHANGELOG.md: what was under Unreleased is now under [${version}] — ${today}`);
  }
  for (const s of stamps(version)) {
    if (s.file === PKG || s.file === "package-lock.json") s.write?.();
  }
  // AGENTS.md's generated blocks come from the CLI at its new version.
  spawnSync(process.execPath, [cli, "upgrade", "--write"], { cwd: repo, stdio: "ignore" });
  for (const s of stamps(version)) {
    if (s.holds() !== s.wants) s.write?.();
  }
  const left = disagreements(version);
  for (const f of left) console.error(`✗ ${f}`);
  if (left.length > 0) return 1;
  console.log(`ok every stamp quotes ${version}`);
  console.log("next: open the release as a change (`doctrina work --chore`), close it, and merge — the Release workflow publishes and tags the version when it reaches main");
  return 0;
}

function pathToCommands() {
  return new URL("../packages/doctrina-cli/src/lib/commands.js", import.meta.url).href;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}

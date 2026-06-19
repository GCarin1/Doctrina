import path from "node:path";
import process from "node:process";
import { exists } from "../lib/fs-ops.js";
import * as idx from "../lib/index-json.js";
import { deriveIndex, indexesMatch, stableStringify } from "../lib/scan.js";
import { cliVersion } from "../lib/version.js";
import { today } from "../lib/dates.js";
import { flagBool } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";

const SUBCOMMANDS = ["rebuild"];

export async function run(positional, flags) {
  const sub = positional[0];
  if (sub !== "rebuild") {
    console.error(c.red("error:") + ` unknown index subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess
      ? `did you mean \`doctrina index ${guess}\`?`
      : `available: ${SUBCOMMANDS.join(", ")}`));
    return 2;
  }
  return rebuild(flags);
}

function rebuild(flags) {
  const check = flagBool(flags, "check", false);
  const projectRoot = process.cwd();
  if (!exists(path.join(projectRoot, ".doctrina"))) {
    throw new Error("not a Doctrina project (no .doctrina/ in cwd). Run `doctrina init` first.");
  }

  let current = null;
  try {
    current = idx.load(projectRoot);
  } catch (err) {
    if (check) {
      console.error(c.red("error:") + ` ${err.message}`);
      return 1;
    }
    console.log(c.yellow("warn:") + ` ${err.message} — rebuilding from scratch`);
  }

  const derived = deriveIndex(projectRoot, current);
  // Migrate the framework stamp to the running CLI (3.6). deriveIndex carries
  // the old value over (so `next` does not nag on a version-only difference);
  // overriding it here lets a stale stamp count as drift, so `index rebuild`
  // both reports and fixes it instead of short-circuiting on "nothing to do".
  derived.framework_version = cliVersion();

  if (indexesMatch(derived, current)) {
    console.log(c.green("ok") + " index.json matches the tree (nothing to do)");
    return 0;
  }

  const drift = describeDrift(current, derived);
  for (const line of drift) console.log((check ? c.yellow("drift: ") : c.gray("sync:  ")) + line);

  if (check) {
    console.log("");
    console.log(c.red("fail") + ` index.json has drifted from the tree (${drift.length} difference${drift.length === 1 ? "" : "s"})`);
    console.log(c.gray("hint: ") + "run `doctrina index rebuild` to regenerate it");
    return 1;
  }

  derived.last_updated = today();
  idx.save(projectRoot, derived);
  const a = derived.artifacts;
  console.log("");
  console.log(c.green("rebuilt") + ` .doctrina/index.json — ${a.specs.length} specs, ${a.decisions.length} decisions, ` +
    `${a.changes.length} open changes, ${a.changes_archive.length} archived, ${a.skills.length} skills`);
  return 0;
}

// Human-readable category-level drift between the on-disk index and the
// derived one: added / removed / changed entry ids.
function describeDrift(current, derived) {
  const lines = [];
  if (!current) return ["index.json missing or unreadable"];
  if ((current.framework_version ?? null) !== (derived.framework_version ?? null)) {
    lines.push(`framework_version: ${current.framework_version ?? "unset"} -> ${derived.framework_version}`);
  }
  const categories = ["specs", "decisions", "changes", "changes_archive", "skills"];
  for (const cat of categories) {
    const cur = new Map((current.artifacts?.[cat] ?? []).map((e) => [e.id, e]));
    const der = new Map((derived.artifacts?.[cat] ?? []).map((e) => [e.id, e]));
    for (const id of der.keys()) {
      if (!cur.has(id)) lines.push(`${cat}: "${id}" on disk but not in index`);
      else if (stableStringify(cur.get(id)) !== stableStringify(der.get(id))) {
        lines.push(`${cat}: "${id}" metadata differs from the files`);
      }
    }
    for (const id of cur.keys()) {
      if (!der.has(id)) lines.push(`${cat}: "${id}" in index but not on disk`);
    }
  }
  if (stableStringify(current.artifacts?.product ?? null) !== stableStringify(derived.artifacts.product)) {
    lines.push("product: metadata differs");
  }
  if (lines.length === 0) lines.push("structural difference (key order or missing category)");
  return lines;
}

export const help = `
Usage: doctrina index <subcommand>

Subcommands:
  rebuild           Regenerate .doctrina/index.json from the artifacts on
                    disk (spec headers, ADR headers, change proposals,
                    archive folders, skill frontmatter). The files are the
                    source of truth; the index is derived.
  rebuild --check   Write nothing; exit 1 with a drift summary when the
                    index no longer matches the tree. CI-friendly.

Fields with no on-disk source (project name, framework_version, product
metadata) are carried over from the existing index.
`;

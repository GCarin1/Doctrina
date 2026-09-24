// @ts-check
import path from "node:path";
import { read, write, exists } from "./fs-ops.js";
import { cliVersion, newestVersion } from "./version.js";

export const SCHEMA_VERSION = "0.1.0";

// The artifact categories a well-formed index.json carries. ONE definition,
// consumed by `blank()` (what `init` writes) and by `templates check` /
// `templates update` (what a project is measured against).
//
// There used to be two: the shape `init` materialised from a template file
// and the shape `templates check` required. Nothing compared them, so when
// `contracts` was added to the expected shape and not to the template,
// every project was born needing a scaffold update (audit item C5).
export const ARTIFACT_CATEGORIES = Object.freeze([
  "specs", "decisions", "changes", "changes_archive", "skills", "contracts",
]);

export function indexPath(projectRoot) {
  return path.join(projectRoot, ".doctrina", "index.json");
}

export function load(projectRoot) {
  const p = indexPath(projectRoot);
  if (!exists(p)) {
    throw new Error(`.doctrina/index.json not found at ${p}`);
  }
  const raw = read(p);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`.doctrina/index.json is not valid JSON: ${err.message}`);
  }
}

export function save(projectRoot, index) {
  // Stamp the managing framework version on every write (3.6): the index
  // records which CLI last wrote it, so a stale stamp (an index written by an
  // older CLI) is detectable by `doctrina validate` and migrated by
  // `doctrina index rebuild`.
  index.framework_version = newestVersion(index.framework_version, cliVersion());
  const p = indexPath(projectRoot);
  const text = JSON.stringify(index, null, 2) + "\n";
  write(p, text, { force: true });
}

export function blank(projectName, date) {
  return {
    $schema_version: SCHEMA_VERSION,
    project: projectName,
    framework_version: cliVersion(),
    last_updated: date,
    artifacts: {
      entrypoint: { path: "AGENTS.md" },
      product: {
        path: ".doctrina/product.md",
        status: "active",
        version: "0.1.0",
        last_updated: date,
      },
      ...Object.fromEntries(ARTIFACT_CATEGORIES.map((cat) => [cat, []])),
    },
  };
}

// INSERT WHERE A REBUILD WOULD HAVE PUT IT.
//
// Every category here is written twice: incrementally, by the command that
// creates the artifact, and wholesale by `index rebuild`, which walks the
// directory — `readdirSync(...).sort()` — and writes what it finds, in that
// order. The two agreed only by luck: appending matches a sorted walk exactly
// when the new entry happens to sort last.
//
// It usually does, which is why this survived. `doctrina spec new alpha` after
// `spec new zebra` does not, and neither does closing change 0138 after 0139 —
// that one shipped, and turned all six test legs of CI red on a tree whose own
// `close` had just reported green.
//
// `validate` cannot see it: drift of this kind is only visible by rebuilding
// and comparing, which is `index rebuild --check`, a different gate. So the
// tree looked healthy from inside and failed from outside.
//
// Each entry's `path` embeds the on-disk name the rebuild sorts by, and the
// parent directory is constant within a category — so ordering by `path`
// reproduces the walk exactly, without this module having to know how any
// category is laid out.
// The comparison has to be the SAME one: `readdirSync(dir).sort()` takes the
// default comparator, which orders by UTF-16 code unit, and `localeCompare`
// does not — it ignores or reweights punctuation, so `0100-a` and `0100_a`
// can come out in the opposite order. Matching the walk means comparing the
// way the walk compares.
function insertInRebuildOrder(list, entry) {
  list.push(entry);
  list.sort((a, b) => {
    const x = String(a.path ?? ""), y = String(b.path ?? "");
    return x < y ? -1 : x > y ? 1 : 0;
  });
  return list;
}

export function addSkill(index, entry) {
  if (!index.artifacts.skills) index.artifacts.skills = [];
  if (!index.artifacts.skills.some((s) => s.id === entry.id)) {
    insertInRebuildOrder(index.artifacts.skills, entry);
  }
  return index;
}

export function addContract(index, entry) {
  if (!index.artifacts.contracts) index.artifacts.contracts = [];
  if (!index.artifacts.contracts.some((s) => s.id === entry.id)) {
    insertInRebuildOrder(index.artifacts.contracts, entry);
  }
  return index;
}

export function touch(index, date) {
  index.last_updated = date;
  return index;
}

export function addSpec(index, entry) {
  if (!index.artifacts.specs.some((s) => s.id === entry.id)) {
    insertInRebuildOrder(index.artifacts.specs, entry);
  }
  return index;
}

export function addDecision(index, entry) {
  if (!index.artifacts.decisions.some((d) => d.id === entry.id)) {
    insertInRebuildOrder(index.artifacts.decisions, entry);
  }
  return index;
}

export function updateDecision(index, id, mutator) {
  const list = index.artifacts.decisions;
  const i = list.findIndex((d) => d.id === id);
  if (i >= 0) list[i] = { ...list[i], ...mutator(list[i]) };
  return index;
}


export function moveChangeToArchive(index, id, archiveEntry) {
  index.artifacts.changes = index.artifacts.changes.filter((c) => c.id !== id);
  if (!index.artifacts.changes_archive.some((c) => c.id === id)) {
    insertInRebuildOrder(index.artifacts.changes_archive, archiveEntry);
  }
  return index;
}

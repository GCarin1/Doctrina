import path from "node:path";
import { read, write, exists } from "./fs-ops.js";

const SCHEMA_VERSION = "0.1.0";

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
  const p = indexPath(projectRoot);
  const text = JSON.stringify(index, null, 2) + "\n";
  write(p, text, { force: true });
}

export function blank(projectName, date) {
  return {
    $schema_version: SCHEMA_VERSION,
    project: projectName,
    framework_version: "0.0.0",
    last_updated: date,
    artifacts: {
      product: {
        path: ".doctrina/product.md",
        status: "active",
        version: "0.1.0",
        last_updated: date,
      },
      specs: [],
      decisions: [],
      changes: [],
      changes_archive: [],
      skills: [],
      contracts: [],
    },
  };
}

export function addSkill(index, entry) {
  if (!index.artifacts.skills) index.artifacts.skills = [];
  if (!index.artifacts.skills.some((s) => s.id === entry.id)) {
    index.artifacts.skills.push(entry);
  }
  return index;
}

export function addContract(index, entry) {
  if (!index.artifacts.contracts) index.artifacts.contracts = [];
  if (!index.artifacts.contracts.some((s) => s.id === entry.id)) {
    index.artifacts.contracts.push(entry);
  }
  return index;
}

export function removeSkill(index, id) {
  if (!index.artifacts.skills) return index;
  index.artifacts.skills = index.artifacts.skills.filter((s) => s.id !== id);
  return index;
}

export function touch(index, date) {
  index.last_updated = date;
  return index;
}

export function addSpec(index, entry) {
  if (!index.artifacts.specs.some((s) => s.id === entry.id)) {
    index.artifacts.specs.push(entry);
  }
  return index;
}

export function removeSpec(index, id) {
  index.artifacts.specs = index.artifacts.specs.filter((s) => s.id !== id);
  return index;
}

export function addDecision(index, entry) {
  if (!index.artifacts.decisions.some((d) => d.id === entry.id)) {
    index.artifacts.decisions.push(entry);
  }
  return index;
}

export function updateDecision(index, id, mutator) {
  const list = index.artifacts.decisions;
  const i = list.findIndex((d) => d.id === id);
  if (i >= 0) list[i] = { ...list[i], ...mutator(list[i]) };
  return index;
}

export function addChange(index, entry) {
  if (!index.artifacts.changes.some((c) => c.id === entry.id)) {
    index.artifacts.changes.push(entry);
  }
  return index;
}

export function moveChangeToArchive(index, id, archiveEntry) {
  index.artifacts.changes = index.artifacts.changes.filter((c) => c.id !== id);
  if (!index.artifacts.changes_archive.some((c) => c.id === id)) {
    index.artifacts.changes_archive.push(archiveEntry);
  }
  return index;
}

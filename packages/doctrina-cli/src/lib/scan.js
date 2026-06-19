import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, walk } from "./fs-ops.js";
import { today } from "./dates.js";
import { parseFrontmatter } from "../commands/skill.js";
import { parseOperation, parseCapabilityFromDelta } from "../commands/change.js";

// Parse a metadata header line, tolerating BOTH conventions:
//   **Name:** value        (spec style)
//   - **Name:** value      (ADR / proposal / intake style)
// The leading "- " is optional so a one-character convention slip (an
// agent hand-authoring an ADR with the bare spec form, or vice versa)
// still parses instead of silently falling back to a default value.
const HEADER_PREFIX = "(?:-\\s+)?";

// Parse a spec-style header line: **Name:** value (dash optional).
export function specHeader(text, name) {
  const m = text.match(new RegExp(`^${HEADER_PREFIX}\\*\\*${name}:\\*\\*\\s+(.+)$`, "m"));
  return m ? m[1].trim() : null;
}

// Parse an ADR/proposal-style header line: - **Name:** value (dash optional).
export function listHeader(text, name) {
  const m = text.match(new RegExp(`^${HEADER_PREFIX}\\*\\*${name}:\\*\\*\\s+(.+)$`, "m"));
  return m ? m[1].trim() : null;
}

function dirEntries(dir) {
  if (!isDir(dir)) return [];
  return readdirSync(dir).filter((e) => !e.startsWith(".")).sort();
}

// Regenerate the index object from the artifacts on disk. The files are
// the source of truth; fields with no on-disk source (project name,
// framework_version, product metadata) are carried over from `current`.
export function deriveIndex(projectRoot, current) {
  const dot = path.join(projectRoot, ".doctrina");
  const date = today();
  const cur = current?.artifacts ?? {};

  const out = {
    $schema_version: current?.$schema_version ?? "0.1.0",
    project: current?.project ?? path.basename(projectRoot),
    framework_version: current?.framework_version ?? "0.0.0",
    last_updated: current?.last_updated ?? date,
    artifacts: {
      product: cur.product ?? {
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

  // Specs — headers inside each spec.md win over the previous index.
  const specsDir = path.join(dot, "specs");
  for (const cap of dirEntries(specsDir)) {
    const p = path.join(specsDir, cap, "spec.md");
    if (!isFile(p)) continue;
    const text = read(p);
    const prev = (cur.specs ?? []).find((s) => s.id === cap);
    const entry = {
      id: cap,
      path: `.doctrina/specs/${cap}/spec.md`,
      status: specHeader(text, "Status") ?? prev?.status ?? "active",
      version: specHeader(text, "Version") ?? prev?.version ?? "0.1.0",
      last_updated: specHeader(text, "Last updated") ?? prev?.last_updated ?? date,
    };
    // Implementation is the capability axis (planned -> partial ->
    // implemented -> verified), independent of the document Status. Only
    // record it when the spec declares it or the index already tracked it,
    // so specs that never opted in (e.g. bug specs) stay off the axis.
    // The stored value keeps any explanatory note after the state word.
    const implRaw = specHeader(text, "Implementation");
    const impl = implRaw ? implRaw.trim() : prev?.implementation;
    if (impl) entry.implementation = impl;
    // Realizes: the product intent anchors this capability delivers (ADR
    // 0006). Stored as an id list so the provenance link is queryable, not
    // just prose. Header wins over the previous index, like Implementation.
    const realizesRaw = specHeader(text, "Realizes");
    const realizes = realizesRaw ? (realizesRaw.match(/[A-Z]+\d+/g) ?? []) : prev?.realizes;
    if (realizes && realizes.length) entry.realizes = realizes;
    out.artifacts.specs.push(entry);
  }

  // Decisions — NNNN-slug.md files; Status/Date headers win.
  const adrDir = path.join(dot, "decisions");
  for (const f of walk(adrDir)) {
    const base = path.basename(f);
    const m = base.match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const text = read(f);
    const prev = (cur.decisions ?? []).find((d) => d.id === m[1]);
    const titleMatch = text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m);
    const entry = {
      id: m[1],
      path: `.doctrina/decisions/${base}`,
      title: titleMatch ? titleMatch[1].trim() : prev?.title ?? base,
      status: listHeader(text, "Status") ?? prev?.status ?? "proposed",
      date: listHeader(text, "Date") ?? prev?.date ?? date,
    };
    const supersedes = listHeader(text, "Supersedes");
    if (supersedes && supersedes !== "—") entry.supersedes = supersedes;
    const supersededBy = listHeader(text, "Superseded by");
    if (supersededBy && supersededBy !== "—") entry.superseded_by = supersededBy;
    const landed = listHeader(text, "Landed");
    if (landed && landed !== "—") entry.landed = landed;
    out.artifacts.decisions.push(entry);
  }

  // Open changes — every directory except archive/.
  const changesDir = path.join(dot, "changes");
  for (const id of dirEntries(changesDir)) {
    if (id === "archive") continue;
    if (!isDir(path.join(changesDir, id))) continue;
    const prev = (cur.changes ?? []).find((c) => c.id === id);
    const proposalPath = path.join(changesDir, id, "proposal.md");
    const proposal = isFile(proposalPath) ? read(proposalPath) : "";
    const titleMatch = proposal.match(/^#\s+Change\s+\S+\s*[—-]\s*(.+)$/m);
    out.artifacts.changes.push({
      id,
      title: titleMatch ? titleMatch[1].trim() : prev?.title ?? id,
      path: `.doctrina/changes/${id}`,
      status: listHeader(proposal, "Status") ?? prev?.status ?? "proposed",
      opened: listHeader(proposal, "Date") ?? prev?.opened ?? date,
    });
  }

  // Archived changes — folder name carries the applied date and id.
  const archiveDir = path.join(changesDir, "archive");
  for (const name of dirEntries(archiveDir)) {
    const m = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    if (!m || !isDir(path.join(archiveDir, name))) continue;
    const prev = (cur.changes_archive ?? []).find((c) => c.path?.endsWith(name));
    const proposalPath = path.join(archiveDir, name, "proposal.md");
    const proposal = isFile(proposalPath) ? read(proposalPath) : "";
    const titleMatch = proposal.match(/^#\s+Change\s+\S+\s*[—-]\s*(.+)$/m);
    const specsAffected = [];
    for (const deltaPath of walk(path.join(archiveDir, name, "specs"))) {
      if (!deltaPath.endsWith("delta.md")) continue;
      const text = read(deltaPath);
      const capability = parseCapabilityFromDelta(text, deltaPath);
      if (capability) {
        specsAffected.push({ capability, operation: parseOperation(text) ?? "MODIFIED" });
      }
    }
    out.artifacts.changes_archive.push({
      id: m[2],
      title: titleMatch ? titleMatch[1].trim() : prev?.title ?? m[2],
      path: `.doctrina/changes/archive/${name}`,
      status: "applied",
      applied: m[1],
      specs_affected: specsAffected,
    });
  }

  // Contracts — the integration/runtime surface (ports, env, interfaces)
  // that no single capability owns. Headers inside each contract win.
  const contractsDir = path.join(dot, "contracts");
  for (const f of walk(contractsDir)) {
    if (!f.endsWith(".md")) continue;
    const id = path.basename(f, ".md");
    const text = read(f);
    const prev = (cur.contracts ?? []).find((s) => s.id === id);
    out.artifacts.contracts.push({
      id,
      path: `.doctrina/contracts/${id}.md`,
      status: specHeader(text, "Status") ?? prev?.status ?? "active",
      last_updated: specHeader(text, "Last updated") ?? prev?.last_updated ?? date,
    });
  }

  // Skills — frontmatter description wins.
  const skillsDir = path.join(dot, "skills");
  for (const f of walk(skillsDir)) {
    if (!f.endsWith(".md")) continue;
    const id = path.basename(f, ".md");
    const prev = (cur.skills ?? []).find((s) => s.id === id);
    out.artifacts.skills.push({
      id,
      path: `.doctrina/skills/${id}.md`,
      description: parseFrontmatter(read(f), "description")
        ?? prev?.description ?? "<edit me — one-sentence summary>",
      last_updated: prev?.last_updated ?? date,
    });
  }

  return out;
}

// Deterministic stringify (sorted keys) so two indexes compare by content,
// not by key insertion order.
export function stableStringify(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

// Content equality ignoring the root last_updated timestamp. Absent
// artifact categories compare equal to empty ones so pre-skills indexes
// are not flagged for a purely structural difference.
export function indexesMatch(a, b) {
  if (!a || !b) return false;
  const normalize = (x) => {
    const clone = { ...x };
    delete clone.last_updated;
    const arts = { ...(clone.artifacts ?? {}) };
    for (const cat of ["specs", "decisions", "changes", "changes_archive", "skills", "contracts"]) {
      arts[cat] = arts[cat] ?? [];
    }
    clone.artifacts = arts;
    return clone;
  };
  return stableStringify(normalize(a)) === stableStringify(normalize(b));
}

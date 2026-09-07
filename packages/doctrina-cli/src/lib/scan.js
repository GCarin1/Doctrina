// @ts-check
import { getHeader, getSection } from "./doc-model.js";
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read, walk } from "./fs-ops.js";
import { today } from "./dates.js";
import { cliVersion } from "./version.js";
import { load } from "./index-json.js";
import { parseFrontmatter } from "./doc-model.js";
import { parseCapabilityFromDelta } from "./doc-model.js";
import { parseOperation } from "./doc-model.js";

// Header reading lives in ONE place now (lib/doc-model.js, audit item M3).
// These two names survive because dozens of call sites use them and the
// distinction they once encoded — spec style vs list style — is now the
// document model's job, not the caller's.
export function specHeader(text, name) {
  return getHeader(text, name);
}

export function listHeader(text, name) {
  return getHeader(text, name);
}

export function parseDependsOn(text) {
  const raw = specHeader(text, "Depends on");
  if (!raw || /^n\/a\b/i.test(raw.trim()) || raw.trim() === "—") return [];
  return raw.match(/[a-z][a-z0-9][a-z0-9-]*/g) ?? [];
}

function dirEntries(dir) {
  if (!isDir(dir)) return [];
  return readdirSync(dir).filter((e) => !e.startsWith(".")).sort();
}


// The capabilities an ADR governs, from its optional "Scope:" header
// (M4). Returns [] when absent, "n/a", or "—" — an unscoped ADR is global
// and belongs in every pack, which is what keeps this backward compatible.
export function parseAdrScope(text) {
  const raw = listHeader(text, "Scope");
  if (!raw || /^n\/a\b/i.test(raw.trim()) || raw.trim() === "—") return [];
  return raw.match(/[a-z][a-z0-9][a-z0-9-]*/g) ?? [];
}

// One sentence describing what an ADR decided, taken from its "## Decision"
// section. This is what a budget-constrained pack falls back to before it
// drops an ADR entirely: a title and a sentence still carry the decision,
// where an omission carries nothing.
export function adrSummary(text) {
  const body = getSection(text, "Decision");
  if (!body) return null;
  for (const line of body.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("<!--") || s.startsWith("#") || s.startsWith("|")) continue;
    // Take the first sentence, capped so the index stays scannable.
    const plain = s.replace(/^[-*\d.]+\s*/, "").replace(/\*\*/g, "");
    const sentence = (plain.match(/^.*?[.!?](?=\s|$)/) ?? [plain])[0].trim();
    if (sentence.length < 12) continue;
    return sentence.length > 220 ? sentence.slice(0, 217).trimEnd() + "..." : sentence;
  }
  return null;
}

// The index entry for ONE decision, derived from its file. This is the
// single definition of a decision record: `deriveIndex` builds the whole
// list from it, and `doctrina decision new` registers a new ADR through it
// rather than assembling a look-alike by hand. Two constructors for one
// record shape is how a field added to the deriver (M4's `summary`) turns
// every freshly created ADR into index drift the moment it is written.
export function decisionEntry(text, basename, prev, date) {
  const id = basename.match(/^(\d{4})-/)?.[1] ?? prev?.id ?? "0000";
  const titleMatch = text.match(/^#\s+ADR\s+\d{4}\s*[—-]\s*(.+)$/m);
  const entry = {
    id,
    path: `.doctrina/decisions/${basename}`,
    title: titleMatch ? titleMatch[1].trim() : prev?.title ?? basename,
    status: listHeader(text, "Status") ?? prev?.status ?? "proposed",
    date: listHeader(text, "Date") ?? prev?.date ?? date,
  };
  const supersedes = listHeader(text, "Supersedes");
  if (supersedes && supersedes !== "—") entry.supersedes = supersedes;
  const supersededBy = listHeader(text, "Superseded by");
  if (supersededBy && supersededBy !== "—") entry.superseded_by = supersededBy;
  const landed = listHeader(text, "Landed");
  if (landed && landed !== "—") entry.landed = landed;
  // Scope (M4): the capabilities this decision governs. ADRs are immutable
  // and never retire, so without a scope every accepted ADR loads into every
  // context pack forever — the pack grows O(project age) with no decay. An
  // ADR with no Scope: is GLOBAL by definition, the backward-compatible
  // default.
  const scope = parseAdrScope(text);
  if (scope.length > 0) entry.scope = scope;
  // Summary: one sentence from the Decision section, so a pack over budget
  // can degrade an ADR to title + summary instead of dropping it outright.
  const summary = adrSummary(text);
  if (summary) entry.summary = summary;
  return entry;
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
    // Project settings, carried over verbatim. `deriveIndex` rebuilds the
    // artifact graph FROM DISK, so anything it does not explicitly carry is
    // silently erased on the next `index rebuild` — config has no on-disk
    // source to be rederived from, which is exactly why it must be listed
    // here alongside project and framework_version. Absent means defaults.
    ...(current?.config !== undefined ? { config: current.config } : {}),
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
    // Depends on: sibling capabilities this spec builds on (0.11.0 field
    // review — specs cited each other only in prose, unreadable by machine).
    // Stored as a capability-id list so `why` can show the graph, `context`
    // can pull dependencies into the read pack, and `review` can flag
    // dependents of a touched capability.
    const depends = specHeader(text, "Depends on") !== null ? parseDependsOn(text) : prev?.depends_on;
    if (depends && depends.length) entry.depends_on = depends;
    out.artifacts.specs.push(entry);
  }

  // Decisions — NNNN-slug.md files; Status/Date headers win.
  const adrDir = path.join(dot, "decisions");
  for (const f of walk(adrDir)) {
    const base = path.basename(f);
    const m = base.match(/^(\d{4})-.*\.md$/);
    if (!m) continue;
    const prev = (cur.decisions ?? []).find((d) => d.id === m[1]);
    out.artifacts.decisions.push(decisionEntry(read(f), base, prev, date));
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
      // The lane the change was born in (change 0042). Optional: a change
      // opened before the field existed simply has none, and every consumer
      // treats its absence as "unknown" rather than as a lane.
      ...laneOf(proposal, prev),
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

  // Entrypoint — the root AGENTS.md the agent reads first (the hub the
  // AGENTS.md-drift gate in `validate` keeps honest). Registering it closes
  // the machine-readable graph in both directions: a tool that enumerates
  // index.json finds the hub itself, not only the artifacts the hub points at.
  // Path-only, so the field never churns the index.
  out.artifacts.entrypoint = { path: "AGENTS.md" };

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

// The lane recorded in a proposal header (change 0042), as an index field —
// or nothing at all. A change opened before the field existed, or one whose
// header is still the empty scaffold, has no lane, and "unknown" is the
// honest answer rather than a default that would poison the mix.
function laneOf(proposal, prev) {
  const raw = (listHeader(proposal, "Lane") ?? "").trim();
  if (!raw) return prev?.lane ? { lane: prev.lane } : {};
  return { lane: raw };
}

/**
 * Is the on-disk index still what the tree derives to, and if not, how does
 * it differ?
 *
 * `index rebuild` renders this (and writes the derived index when asked);
 * `doctor` reports it as one row. Before this it was the command's private
 * business, so `doctor` answered "has the index drifted?" by spawning the
 * CLI again and reading an exit code (audit finding F4).
 *
 * The framework stamp is migrated to the running CLI here rather than in the
 * caller: deriveIndex carries the old value over so `next` does not nag on a
 * version-only difference, and overriding it lets a stale stamp COUNT as
 * drift, so `index rebuild` both reports and fixes it instead of
 * short-circuiting on "nothing to do".
 *
 * @param {string} projectRoot
 * @returns {{ok: boolean, drift: string[], derived: any, current: any, unreadable: string|null}}
 */
export function collectIndexDrift(projectRoot) {
  let current = null;
  let unreadable = null;
  try {
    current = load(projectRoot);
  } catch (err) {
    unreadable = err.message;
  }
  const derived = deriveIndex(projectRoot, current);
  derived.framework_version = cliVersion();
  if (indexesMatch(derived, current)) {
    return { ok: true, drift: [], derived, current, unreadable };
  }
  return { ok: false, drift: describeDrift(current, derived), derived, current, unreadable };
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

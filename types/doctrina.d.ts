// Audit item M5. The shapes the CLI passes around that are NOT expressible
// where they are built: `index.json` is read from disk as `any`, and the
// flag map and artifact model are structural conventions the code has
// always relied on and never stated.
//
// These are ambient declarations for the typecheck only. Nothing imports
// them at runtime, nothing is compiled, and `src/` stays plain ESM that
// node runs directly (`tsconfig.json` is `noEmit`).

/** The parsed argv flag map every command receives. */
type FlagMap = Map<string, string | boolean>;

/** One capability spec's entry in `.doctrina/index.json`. */
interface SpecEntry {
  id: string;
  path: string;
  status: string;
  version: string;
  last_updated: string;
  /** planned | partial | implemented | verified, plus any trailing note. */
  implementation?: string;
  /** Product intent anchors this capability delivers (ADR 0006). */
  realizes?: string[];
  /** Sibling capabilities this spec builds on. */
  depends_on?: string[];
}

/** One ADR's entry. See `decisionEntry()` in `lib/scan.js` — the single deriver. */
interface DecisionEntry {
  id: string;
  path: string;
  title: string;
  status: string;
  date: string;
  supersedes?: string;
  superseded_by?: string;
  landed?: string;
  /**
   * Capabilities this decision governs (ADR 0022). ABSENT means global:
   * the ADR joins every context pack, which is the backward-compatible
   * default and why the field is optional rather than defaulted to [].
   */
  scope?: string[];
  /** One sentence from the Decision section, for degraded context packs. */
  summary?: string;
}

interface ChangeEntry {
  id: string;
  title: string;
  path: string;
  status: string;
  opened?: string;
  applied?: string;
  specs_affected?: Array<{ capability: string; operation: string }>;
}

interface SkillEntry {
  id: string;
  path: string;
  description: string;
  last_updated: string;
}

interface ContractEntry {
  id: string;
  path: string;
  status: string;
  last_updated: string;
}

/**
 * `.doctrina/index.json` — the machine-readable artifact graph. Everything
 * under `artifacts` is DERIVED from the tree by `deriveIndex()`; everything
 * beside it is carried over, because it has no on-disk source to be
 * rederived from. A field added to the deriver and not to the carry-over
 * list is silently erased on the next `index rebuild`.
 */
interface DoctrinaIndex {
  $schema_version: string;
  project: string;
  framework_version: string;
  last_updated: string;
  /** Project settings. Absent means defaults throughout. */
  config?: {
    /** Token ceiling for `doctrina context` (ADR 0022). */
    context_budget?: number;
  };
  artifacts: {
    entrypoint?: { path: string };
    product: { path: string; status: string; version: string; last_updated: string };
    specs: SpecEntry[];
    decisions: DecisionEntry[];
    changes: ChangeEntry[];
    changes_archive: ChangeEntry[];
    skills: SkillEntry[];
    contracts: ContractEntry[];
  };
}

/** A candidate lesson found by `doctrina skill suggest`. */
interface SkillCandidate {
  id: string;
  slug: string;
  source: "change" | "commit";
  /** Archived change folder the candidate came from. */
  from?: string;
  /** Commit sha the candidate came from. */
  ref?: string;
  /** One line on what the lesson is. Absent when nothing legible was found. */
  why?: string;
}

/** One item in an assembled context pack (`doctrina context`). */
interface PackItem {
  rel: string;
  note: string;
  lines: number;
  tokens: number;
  fullTokens?: number;
  tier: number;
  /** Comparable relevance tuple, best-last. See `relevance()`. */
  rank: number[];
  degraded: boolean;
  dropped?: boolean;
  title?: string;
  summary?: string | null;
  adrId?: string;
}

# Spec — Skills

**Capability:** skills
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Source:** `packages/doctrina-cli/src/commands/skill.js`
**Last updated:** 2026-07-02
**Version:** 0.6.0

## Purpose

Define how Doctrina stores and validates **on-demand procedural
memory** — specialised "how to do X" knowledge that should load
only when a specific task matches, not on every agent turn.
Complements AGENTS.md (always-loaded procedural memory) without
replacing it.

## Requirements (EARS)

### Ubiquitous

- The system shall locate skills at `.doctrina/skills/<slug>.md`
  where `<slug>` matches `[a-z][a-z0-9-]*`.
- The system shall require each skill file to carry frontmatter
  with three fields: `name`, `description`, `when`.
- The system shall cap each skill file at 200 lines (warning at
  150). Hard cap is a warning, not an error.
- The system shall require the `name:` frontmatter field to
  match the filename slug; mismatch is a warning at validate
  time.
- The system shall reference skills from `.doctrina/index.json`
  under `artifacts.skills` as an array parallel to `specs`.
- A skill's `when:` trigger shall name something a task can be matched against — a keyword, path, command, or error string — because context ranks skills by that trigger.
- The system shall fold a generated skill slug — stripping diacritics and lowercasing — before reducing it to slug characters, so that an accented or capitalised source name survives as letters rather than as hyphens.

### Event-driven

- When `doctrina skill new <name>` runs, the system shall
  scaffold `.doctrina/skills/<name>.md` from
  `templates/skill.md.template` and append an entry to the
  index.
- When `doctrina skill list` runs, the system shall print one
  line per skill containing the slug and the description from
  frontmatter; the command is strictly read-only.
- When `doctrina skill sync` runs, the system shall copy each
  skill's frontmatter `description:` into the matching index
  entry, indexing skills present on disk but absent from the
  index. The frontmatter is the single source of truth for the
  description; the command never edits skill files.
- When `doctrina skill suggest` runs, the system shall list
  fix-shaped lessons not yet captured as skills, drawn from two
  deterministic sources — archived change proposals
  (`.doctrina/changes/archive/`) and fix-shaped commits in the
  git history — deduplicated by slug against existing skills and
  each other. With `--write` the system shall scaffold a stub per
  candidate, pre-seeded from its source, and index it; with
  `--since <ref>` it shall scan commits in `<ref>..HEAD` instead
  of the most recent window. The command surfaces candidates
  only; it never authors the lesson body (ADR 0013).
- When `doctrina validate` runs, the system shall walk
  `.doctrina/skills/` and emit a warning for any skill missing
  one or more of the required frontmatter fields, any skill
  over the 200-line cap, and any skill whose `name:` field
  does not match its filename slug.
- When `doctrina validate` runs, the system shall emit a warning
  for any skill whose frontmatter `description:` differs from
  the description recorded in `.doctrina/index.json`, pointing
  at `doctrina skill sync`.
- When a skill is drafted from an error, the system shall fill its trigger from that error's own paths, identifiers and distinctive terms, and shall leave the procedure to the author.

### State-driven

- While a skill is present on disk but absent from the index,
  the system shall emit the existing orphan-detection warning
  at validate time.

### Unwanted-behavior (must-not)

- The system shall not auto-generate skill content from LLM
  output. Skills are authored by humans, like specs and ADRs.
- The system shall not load every skill into agent context by
  default. The agent reads frontmatter descriptions and loads
  the full body on demand; the framework neither enforces nor
  prevents that behaviour, but the design assumes it.
- Skills shall not duplicate spec content. Specs describe what
  the system does (semantic); skills describe how to perform a
  task well (procedural).
- The system shall not treat a `when:` trigger still in the scaffold's `<...>` form as detectable, and `skill sync` shall say the skill is still the scaffold rather than report it up to date.

### Optional

- Where an agent runtime exposes a native skills loading API
  (e.g. Claude Code's Skills feature), the user may point the
  runtime at `.doctrina/skills/` so skills are discovered
  through the native pathway.

## Acceptance criteria

A `.doctrina/skills/` directory is spec-compliant when:

1. Every `*.md` file under it carries the three required
   frontmatter fields — enforced by the skills walk in
   `packages/doctrina-cli/src/commands/validate.js` against the live
   skills (e.g. `.doctrina/skills/add-cli-command.md`).
2. No file exceeds 200 lines — enforced by
   `packages/doctrina-cli/src/commands/validate.js`.
3. Each file's `name:` field matches its filename slug — enforced by
   `packages/doctrina-cli/src/commands/validate.js`.
4. Every skill present on disk is referenced in
   `.doctrina/index.json` under `artifacts.skills`.
5. Each indexed description matches the skill's frontmatter
   `description:` — `doctrina skill sync` restores this
   (`packages/doctrina-cli/src/commands/skill.js`), and drift warns in
   `packages/doctrina-cli/src/commands/validate.js`.
6. [verified] A trigger drafted from an error satisfies validate's detectable-trigger check — verified by `packages/doctrina-cli/test/orchestration.test.js`.
7. [verified] Skills matching a `--for` query are ranked above the rest and marked — verified by `packages/doctrina-cli/test/context-retrieval.test.js`.
8. [verified] A scaffolded skill's `when:` is not a detectable trigger and `skill sync` names it as scaffold; once filled, sync indexes it — verified by `packages/doctrina-cli/test/a-scaffold-is-not-an-artifact.test.js`.
9. [verified] A generated slug folds accents and capitals instead of deleting them, and matches the `[a-z][a-z0-9-]*` shape this spec requires of a skill filename — verified by `packages/doctrina-cli/test/o-acento-nao-e-ruido.test.js`.

## Out of scope for this spec

- Per-agent loading semantics beyond the AGENTS.md read-order
  mention. Each agent runtime decides how to honour the
  on-demand contract.
- Skill marketplaces, remote skill loading, cross-project skill
  sharing — covered indirectly by the conventions-repo pattern
  in `context-engineering.md`.
- Automatic authoring of skill content. `doctrina skill suggest`
  deterministically *surfaces* fix-shaped candidates (and `--write`
  scaffolds an empty, pre-seeded stub), but the lesson itself is
  written by a human, never generated or predicted (ADR 0013).

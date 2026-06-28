# ADR 0013 — Broaden skill suggest signal source to git history

- **Status:** accepted
- **Date:** 2026-06-28
- **Deciders:** Gcarini
- **Supersedes:** —
- **Superseded by:** —
- **Evidence:** —
- **Landed:** 2026-06-28 — `packages/doctrina-cli/src/commands/skill.js`

## Context

`doctrina skill suggest` (ADR 0012 #6) exists so a hard-won, fix-shaped lesson
is captured as a skill before the next agent or session has to relearn it. As
shipped in 0.8 it scans a single source: archived change proposals under
`.doctrina/changes/archive/` whose folder name is fix-shaped.

That source only fills if a team runs the full `doctrina change → … → change
archive` lifecycle. Many adopting repos — including Doctrina's own, whose
`archive/` holds only `.gitkeep` — do their work directly in git and never
populate the archive. For them `skill suggest` always prints "nothing found",
so the feature is inert exactly where it should be most useful: a real project
with a real history of fixes. The reported symptom was a 0.8 user running
`skill suggest --write`, getting an empty result, and reasonably reading it as
a gap rather than a correct-but-empty scan.

The fix-shaped signal does exist in those repos — in the commit history. A
commit subject like `fix: tolerate trailing comma` is the same textbook
skill-worthy lesson the archive scan looks for, available without any change
lifecycle.

## Decision

Add the git commit history as a **second deterministic source** for
`doctrina skill suggest`, alongside the change archive.

- A commit is a candidate when its subject matches a narrow fix-shaped pattern
  (`FIX_SHAPED_SUBJECT`): conventional fix-type prefixes (`fix:`, `fix(scope):`,
  `bug:`, `hotfix:`, `patch:`, and free-form "Fix …") or a small set of
  strongly fix-flavoured debugging keywords (tolerate, workaround, deadlock,
  flaky, race condition, retry, sanitize). It deliberately excludes
  `feat:`/`refactor:`/`docs:`/`chore:`. The subject pattern is narrower than the
  archive's `FIX_SHAPED` because a free-form subject tolerates less noise than a
  deliberately-named change folder.
- The slug is derived from the subject (conventional prefix stripped), then run
  through the existing `skillSlug` cap. Candidates are deduplicated by slug
  against existing skills, against archive candidates (archive wins — its
  `## Why` is a richer seed than a subject line), and against each other.
- The default window is the most recent 200 non-merge commits; `--since <ref>`
  scans `<ref>..HEAD` instead. The listing caps at 20 candidates with a
  "+N more" line. `--write` scaffolds a pre-seeded stub per candidate exactly as
  the archive path already does, labelling the origin as the short commit SHA.

**Scope limit — this stays a hint, never a decision (ADR 0005).** The match is a
regex over commit metadata; the tool never reads a diff to infer a lesson, and
it never authors skill content. The human still writes the skill; `suggest` only
points at where a lesson probably lives. When git is absent, the directory is
not a repo, or a `--since` ref is unknown, the git source yields nothing and the
command degrades silently to archive-only.

## Alternatives considered

1. **Keep archive-only (status quo).** Rejected: leaves the feature inert in any
   repo that does not run the change lifecycle, which is most of them.
2. **Read commit diffs / NL bodies to infer lessons semantically.** Rejected:
   crosses the ADR 0005 semantic-fidelity ceiling, is non-deterministic, and
   turns a hint into a judgement the framework is not allowed to make.
3. **Scan "since the last git tag" by default.** Rejected: behaviour shifts
   every time the maintainer tags a release, making the default unpredictable; a
   fixed commit window plus an explicit `--since` override is easier to reason
   about.

## Consequences

**Positive**

- `skill suggest` becomes useful in any git repo, not only those running the
  change lifecycle — directly addressing the reported 0.8 gap.
- Zero new runtime dependencies: reuses the `spawnSync("git", …)` pattern
  already present in `review`, `verify`, and `metrics`.

**Negative**

- Conventional `fix:` commits can be frequent, producing noise. Mitigated by the
  narrow subject pattern, slug dedup against existing skills, and the display
  cap.
- The git source makes `git` a soft runtime dependency for this one command;
  absence degrades gracefully to archive-only rather than erroring.

**Neutral**

- The archive remains a first-class source and wins slug collisions.
- The skills spec moves "automatic skill suggestion" out of its blanket
  out-of-scope list: surfacing candidates is in scope; authoring the lesson
  body is not.

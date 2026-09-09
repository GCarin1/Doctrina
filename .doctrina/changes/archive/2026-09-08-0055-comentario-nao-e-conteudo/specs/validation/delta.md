# Spec Delta — capability: validation

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/validation/spec.md`

<!--
For ADDED: include the full new spec body below. On apply, the body is
written verbatim to the target path.

For MODIFIED: prefer a fenced `ops` block — on apply the CLI executes it
against the target spec, all ops or none (ADR 0007). The verbs cover
headers, acceptance criteria, AND the EARS requirement bullets, so a
typical delta applies mechanically end to end; only free-prose rewrites
(Purpose, Maturity, ...) stay a by-hand merge. A MODIFIED delta with no
`ops` block prints a manual-merge pointer.

  ```ops
  set-header Implementation: verified — durable adapter (`src/db.ts`)
  bump-version minor
  set-criterion 1: verified
  append-criterion [unverified] new signal — verified by `test/x.test.ts`
  append-requirement event: When <trigger>, the system shall <action>.
  replace-requirement ubiquitous 2: The system shall <action>.
  ```

Requirement sections: ubiquitous | event | state | unwanted | optional.
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

## What changes

The document model owns the rule that an HTML comment is annotation, not
content. It already owned the header grammar, the section grammar and the
delta grammar (ADR 0021); the comment rule was the one piece of it three
readers each decided for themselves, and two of them decided wrong.

```ops
bump-version minor
append-requirement ubiquitous: The system shall treat an HTML comment in an artifact as annotation rather than content, and every module that scans an artifact shall obtain the comment ranges from the document model instead of deciding for itself.
append-requirement unwanted: The system shall not count a bullet, a command reference, or a fenced block that lies inside an HTML comment as authored content of the artifact.
append-criterion [verified] A comment is blanked without moving any surviving character or line, and a bullet, a command name and an ops fence inside one all stop being read as content while an op value containing a comment marker still applies verbatim — verified by `packages/doctrina-cli/test/comment-is-not-content.test.js`.
```

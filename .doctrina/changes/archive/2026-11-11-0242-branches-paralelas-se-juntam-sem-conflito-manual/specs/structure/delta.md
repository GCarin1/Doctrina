# Spec Delta — capability: structure

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/structure/spec.md`

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
To take one out: `remove-requirement <section> <n>` / `remove-criterion <n>`
(the criteria after it renumber; write removals highest number first).
append-* ops resolve numbering/position at APPLY time, so several open
changes appending to the same spec never collide on numbers — order of
application decides.

For REMOVED: the body may be empty; on apply, the target spec file is
deleted and the capability is recorded in the change archive only.
-->

---

<!-- delta body below -->

```ops
append-requirement event: When git calls `doctrina index merge <base> <ours> <theirs>`, the system shall write over `<ours>` the three-way merge of the three indexes as lists of artifacts — an entry one side added kept, an entry one side removed dropped, and a field both sides changed set to the later version, the later date or the newer `framework_version` — and exit 0; a side that is not JSON shall exit 1 with nothing written.
append-requirement unwanted: If `.doctrina/index.json` carries the conflict markers of a git merge, then the system shall not report it as a JSON parse position: it shall name the markers and `doctrina index rebuild` as what writes the index again.
append-criterion [verified] The merge of two indexes keeps what each side added, drops what each side removed, takes 0.10.0 over 0.2.0 and the later date, never lowers the stamp, and is ordered as a rebuild orders it; an index with conflict markers is named as one and a rebuild heals it; `index merge` with fewer than three files exits 2 and with a side that is not JSON exits 1 — verified by `packages/doctrina-cli/test/branches-paralelas-se-juntam.test.js`.
bump-version minor
```

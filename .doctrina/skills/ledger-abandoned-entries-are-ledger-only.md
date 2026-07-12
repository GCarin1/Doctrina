---
name: ledger-abandoned-entries-are-ledger-only
description: Two-source cross-checks must exempt entries that one source records by design and the other deletes — an abandoned change is ledger-only, never archived
when: Adding or editing a validate check that cross-references two records of the same history (LEDGER.md ↔ index.json, file ↔ index), or touching `change abandon`
---

# Skill — ledger-abandoned-entries-are-ledger-only

## When to use this skill

- Writing or changing a `validate` check that requires two artifacts to agree
  (e.g. `changes/archive/LEDGER.md` ↔ `index.json.changes_archive`).
- Touching `change abandon` or any command that deliberately writes to ONE of
  two mirrored records.

## Procedure

1. Before requiring "every id in A exists in B", enumerate the writers of A
   and B and ask: is there a lifecycle where one side is written and the
   other is deleted BY DESIGN? (`change abandon` appends `— abandoned` to the
   ledger and deletes the change folder — there is deliberately no archive
   entry.)
2. Exempt that lifecycle explicitly in the check, keyed on the recorded
   marker (the ledger line's trailing `abandoned`), not on heuristics.
3. Add a test: abandon a change, run `doctrina validate`, assert exit 0.
4. Grep for other two-source checks with the same blind spot before closing
   (`metadataDrift`, orphan checks, LEDGER cross-checks).

## Anti-patterns

- Requiring set-equality between two records whose writers are not symmetric:
  every `change abandon` turned `validate` permanently red (found while
  dogfooding change 0001-review-followups on 2026-07-12) and the only "fix"
  was hand-editing history.
- Fixing the symptom by deleting the ledger line — the abandonment record IS
  the point; the check was wrong, not the ledger.

## Related material

- `packages/doctrina-cli/src/commands/validate.js` (ledger ↔ index check)
- `packages/doctrina-cli/src/commands/change.js` (`changeAbandon`)
- ADR 0014 — field-review follow-ups

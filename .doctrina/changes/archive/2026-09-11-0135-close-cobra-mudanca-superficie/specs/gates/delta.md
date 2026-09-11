# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

O gate de documentação do `close` pergunta se um leitor consegue aprender
**como** aquilo funciona. Ninguém perguntava se um leitor consegue
descobrir **que** aquilo mudou, e a segunda pergunta não é respondida pela
primeira: prosa descrevendo comportamento novo se lê exatamente como prosa
que sempre o descreveu.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement event: When `doctrina close` runs on a change that alters a documented surface, the system shall refuse the close unless the same work also records the change in the project's changelog, shall stay silent for a project that keeps none, and `--force` shall close anyway and record the gap in the archive ledger.
append-criterion [verified] A surface change with an untouched changelog is refused naming what it saw change, touching the changelog satisfies it, a change touching no documented surface is never asked, and a project with no changelog is never given one to keep — verified by `packages/doctrina-cli/test/the-changelog-is-a-gate.test.js`.
```

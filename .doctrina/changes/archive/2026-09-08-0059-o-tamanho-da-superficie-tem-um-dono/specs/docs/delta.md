# Spec Delta — capability: docs

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/docs/spec.md`

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

O catálogo é dono de quantos comandos e operações existem; o diretório de
decisões é dono de quantos ADRs existem. Toda contagem escrita na prosa é
cópia, e cópia sem verificação apodrece — quatro delas apodreceram em quatro
direções diferentes debaixo de um check que olhava dois arquivos e uma só
forma de afirmação.

```ops
bump-version minor
append-requirement ubiquitous: The system shall check every stated count of the command surface and of the decision set against the catalog and the decisions directory that own them, in the root READMEs and in every Markdown file under `docs/`, in both languages.
append-criterion [verified] A stale operation count, a stale count in a page under `docs/`, and an ADR range that stops short of the highest decision on disk are each reported, and this repository's own counts agree with its catalog — verified by `packages/doctrina-cli/test/check-docs.test.js`.
```

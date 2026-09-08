# Spec Delta — capability: insight

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/insight/spec.md`

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

O leitor de seções do `product.md` passa a aceitar prosa além de bullets — o
comentário do próprio template convida prosa — e a ignorar o comentário do
template, que nunca foi um item declarado. E a mensagem do caso vazio deixa de
mandar criar uma seção que existe: "a seção está vazia" e "a seção não existe"
são pedidos diferentes.

```ops
bump-version minor
append-requirement event: When reading a declared section of `product.md`, the system shall count a paragraph as one item alongside a bullet, and shall never read the template's own instructional comment as a declared item.
append-requirement unwanted: The system shall not tell an author to create a section that already exists.
append-criterion [verified] Prose, two paragraphs and bullets are each read as declared, the template comment is not, an empty section is told to be filled while a missing one is told to be created, and this repository's four non-goals are unchanged — verified by `packages/doctrina-cli/test/non-goals-in-prose.test.js`.
```

# Spec Delta — capability: authoring

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/authoring/spec.md`

---

<!-- delta body below -->

## What changes

O `decision accept` recusa um ADR cujo corpo ainda é o molde, e passa a
re-derivar a entrada inteira do índice em vez de só o status — o autor escreve
o corpo entre o `new` e o `accept`, e é dele que saem o resumo e o escopo
indexados.

```ops
bump-version minor
append-requirement unwanted: The system shall not accept a decision record whose Context, Decision or Consequences section is still the shipped template, and shall name the sections that remain unwritten.
append-requirement event: When a decision record is accepted, the system shall re-derive its whole index entry from the file, so the summary and scope the author wrote before accepting are the ones recorded.
append-criterion [verified] An untouched decision record is refused with its unwritten sections named and its Status left alone, one with a one-line decision is accepted, and accepting leaves the index in sync — verified by `packages/doctrina-cli/test/the-mould-is-not-content.test.js`.
```

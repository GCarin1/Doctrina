# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

O gate de docs lê NOMES do texto autorado, e um nome é tudo o que ele
enxerga. Uma change que diz "o `coverage` não sabe que este teste existe"
descreve um efeito; uma linha de escopo dizendo "não toca `verify`"
descreve uma ausência. As duas se leem como uma change que altera o
comando.

Nenhuma extração mais esperta resolve, porque a diferença é semântica e o
ADR 0005 a mantém fora de um gate determinístico. Quem escreve declara.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement event: When a change's proposal declares `Documented surface: n/a — <why>`, the system shall read the names in that change's prose as mentions and report no surface signal, and shall ignore the declaration when it carries no reason.
append-criterion [verified] A declared, explained non-change reports no signal, `none` reads as `n/a`, a bare one silences nothing, and an undeclared change keeps the gate exactly as sensitive — verified by `packages/doctrina-cli/test/a-mention-is-not-a-change.test.js`.
```

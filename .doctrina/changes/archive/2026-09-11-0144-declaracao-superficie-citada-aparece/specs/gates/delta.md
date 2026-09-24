# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

A declaração que a change 0139 criou existia em dois lugares: no código e
na referência de CLI. Não existia onde o autor escreve a proposta, nem na
mensagem com que o gate recusa — que oferecia só `--force`, a pior das
duas saídas.

E ela era lida do texto cru, então um exemplo dentro de comentário valia
como declaração.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement event: When the docs gate refuses a change, the system shall name both remedies — documenting the surface, and declaring on the record that the names are only mentioned — before offering to force the close.
append-requirement unwanted: The system shall not accept a `Documented surface` declaration that lies inside an HTML comment, because annotation is not something a person wrote.
append-criterion [verified] The declaration inside a comment does not silence the gate, and a change scaffolded from the shipped proposal template with a real surface change is still caught — verified by `packages/doctrina-cli/test/a-mention-is-not-a-change.test.js`.
```

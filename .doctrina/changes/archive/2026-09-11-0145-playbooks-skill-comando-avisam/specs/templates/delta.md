# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

O playbook que o agente executa repetia a sequência de fechamento numa
lista própria — uma segunda cópia de algo que `gates.js` declara e que o
próprio `close` imprime. Ela já estava defasada em quatro passos.

E nenhum dos procedimentos avisava do que o `close` passou a cobrar: a
entrada de changelog, e a declaração que responde a um nome apenas citado.

```ops
bump-version minor
set-header Last updated: 2026-09-11
append-requirement unwanted: The system shall not restate a declared sequence inside a playbook; a playbook shall point at the command that prints it, so a reader never meets a second copy that has gone stale.
append-requirement event: When a playbook describes closing a change, the system shall name every gate that asks the author to WRITE something — the documentation, the changelog entry, and the declaration that a named surface is only mentioned — before the close refuses for want of it.
append-criterion [verified] The work playbook names the writing gates and no longer restates the closing sequence, and every playbook variant still renders byte for byte against its golden — verified by `packages/doctrina-cli/test/playbooks.test.js`.
```

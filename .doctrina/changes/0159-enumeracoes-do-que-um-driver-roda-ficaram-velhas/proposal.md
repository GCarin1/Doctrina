# Change 0159-enumeracoes-do-que-um-driver-roda-ficaram-velhas — enumeracoes do que um driver roda ficaram velhas

- **Status:** proposed
- **Date:** 2026-09-22
- **Owner:**
- **Lane:** product (uncertain; signals: change)
- **Affects specs:** docs

<!--
Optional, and usually absent. The closing docs gate reads COMMAND and FLAG
names out of the prose below and asks for documentation when it finds any.
It cannot tell a change from a mention: explaining an effect, or writing a
Scope boundaries line about what this deliberately does NOT touch, names
things just as loudly as changing them would.

When that happens, say so on the record instead of forcing the close:

- **Documented surface:** n/a — names two commands to explain an effect; alters neither

`none` reads the same as `n/a`, and a BARE one silences nothing — the
reason is the declaration.
-->

## Why

Duas enumeracoes de o que um driver roda ficaram para tras. Onze trechos de documentacao dizem que o hook de pre-commit roda validate --fix, e desde a change 0156 ele roda duas coisas. E o contrato system enumera cinco dos seis passos da action composta, sem o gate de orcamento de contexto. A change 0150 ja provou esse padrao para a sequencia de fechamento; o teste que ela deixou so cobre aquela cadeia.

## What

<!-- The shape of the change: artifacts created or modified, specs affected. -->

## Scope boundaries

<!-- Anything adjacent that this change deliberately does NOT touch. -->

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).

## Open questions

<!-- List unresolved decisions. Empty if none. -->

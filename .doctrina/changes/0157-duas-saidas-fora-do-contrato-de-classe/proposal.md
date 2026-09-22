# Change 0157-duas-saidas-fora-do-contrato-de-classe — duas saidas fora do contrato de classe

- **Status:** proposed
- **Date:** 2026-09-22
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** cli

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

O comando hooks install fora de um repositorio git devolve a classe de gate quando nada foi medido: e uma precondicao, e a mensagem nao traz a linha de hint nomeando o comando que a resolve. E a regra de precondicao da spec cli lista tres excecoes quando o next e uma quarta: ele responde com a acao de init e sai zero, de proposito, e a spec nao diz isso.

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

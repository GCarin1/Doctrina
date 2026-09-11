# Change 0151-gate-de-pr-cobre-toda-checagem-declarada — gate de pr cobre toda checagem declarada

- **Status:** applied
- **Applied:** 2026-09-11
- **Date:** 2026-09-11
- **Owner:**
- **Lane:** product (confident; signals: requisito)
- **Affects specs:** gates
- **Documented surface:** n/a — nomeia comandos de gate para dizer onde cada um roda; nenhum comando ou flag muda

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

O gate de pull request repete a lista de checagens a mao em vez de executar a lista declarada, e a copia perdeu uma: docs-shape esta em verify.json, o release executa a lista inteira e o pull request nao. Nada exige que o gate de integracao cubra toda checagem declarada, entao a requisito e que falta.

## What

O job de gates do `ci.yml` ganha o passo que faltava, `node
scripts/check-docs.js` — a oitava checagem declarada, que não rodava em
job nenhum. Fica nesse job, e não na matriz, porque ela lê Markdown: nem o
sistema operacional nem a versão do Node mudam a resposta dela.

O `$comment` do `verify.json` afirmava que o conjunto declarado e o da
action coincidiam. Não coincidiam em nenhuma das duas direções, e a
afirmação é trocada pela verdadeira: a action é genérica, o resto roda como
passo próprio, e toda checagem declarada roda em pull request.

Um teste novo compara a declaração com os dois arquivos de workflow e
reprova qualquer checagem declarada que não apareça em nenhum deles.

Artefatos: `.github/workflows/ci.yml`, `.doctrina/verify.json`,
`packages/doctrina-cli/test/toda-checagem-declarada-roda-no-ci.test.js`
(novo), delta na spec `gates`.

## Scope boundaries

A action composta continua genérica: ela roda os gates que qualquer
projeto tem, e não passa a rodar o typecheck, a suíte ou o checador de
docs deste repositório. A duplicação entre o workflow e a declaração
também fica: o `ci.yml` escreve os passos um a um de propósito, para que
uma perna da matriz falhe no passo exato — o que faltava não era unificar,
era ninguém conferir que a cópia estava inteira.

## Verification

<!--
How you will know the change is correctly applied. Use checkboxes: every
box here is a claim that must be PROVEN before the change is done.
`doctrina change archive` refuses to archive while any box below is
unchecked (pass --force to archive anyway and record the gap). Distinguish
"task marked done" from "verification passed" — link the evidence.
-->

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Toda checagem de `verify.json` aparece no workflow de pull request ou
      na action, provado em
      `packages/doctrina-cli/test/toda-checagem-declarada-roda-no-ci.test.js`
      — que reprova a árvore anterior, com `docs-shape` ausente.

## Open questions

Nenhuma.

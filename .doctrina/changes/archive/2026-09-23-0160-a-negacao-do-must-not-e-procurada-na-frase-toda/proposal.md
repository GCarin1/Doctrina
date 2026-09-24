# Change 0160-a-negacao-do-must-not-e-procurada-na-frase-toda — a negacao do must-not e procurada na frase toda

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** product (confident; signals: must, requisito)
- **Affects specs:** structure, gates, validation structure

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

O checador de EARS aceita como proibicao qualquer requisito que contenha a palavra no em qualquer lugar da frase: a regra da secao unwanted procura not, no ou never na linha inteira em vez de procurar a negacao presa ao modal. Duas obrigacoes positivas das specs deste repositorio estao arquivadas em must-not e passam so por isso.

## What

A regra da seção must-not em `packages/doctrina-cli/src/lib/ears.js` passa
a exigir a negação presa ao modal: `shall not`, `shall never`, ou o objeto
que o verbo nega na sequência — `shall do no work`, `shall carry neither`.

A folga entre o verbo e o negador é de UMA palavra de propósito. Com duas,
`shall report when no contracts are declared` volta a passar: um relato, não
uma proibição, que é exatamente a forma que a checagem existe para manter
fora dessa seção.

As duas obrigações positivas que estavam arquivadas em must-not passam a ser
as proibições que sempre significaram — a regra não muda, a frase muda.

Artefatos: `packages/doctrina-cli/src/lib/ears.js`,
`packages/doctrina-cli/test/uma-proibicao-nega-o-proprio-modal.test.js`
(novo), deltas nas specs `structure`, `gates` e `validation`.

## Scope boundaries

As outras seções do checador ficam como estão: elas já cobram a abertura da
frase, e a passada de sonda mostrou que pegam o que deveriam pegar.

Nenhum achado do checador vira erro: todos continuam warnings, porque uma
spec evolui e a validação estrutural não bloqueia por gramática.

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
- [x] Uma frase que só contém a palavra negativa é reportada, toda forma que
      nega o modal passa, e todo requisito must-not deste repositório proíbe
      alguma coisa — provado em
      `packages/doctrina-cli/test/uma-proibicao-nega-o-proprio-modal.test.js`.

## Open questions

Nenhuma.

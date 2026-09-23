# Change 0162-o-status-do-intake-nao-tem-dono-nem-gate — o status do intake nao tem dono nem gate

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** runtime (uncertain; signals: em silencio)
- **Affects specs:** structure, authoring structure

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

O header Status do intake e um valor de controle que o next le para decidir se o bootstrap acabou, mas nenhum comando o escreve e nenhum gate o valida: o playbook manda o agente editar o arquivo a mao. Qualquer token que nao seja converted le como pendente em silencio, inclusive convertido em portugues e um valor vazio, e o validate sai zero em todos. Num spec o mesmo erro de enum e erro.

## What

`lib/intake-model.js` passa a declarar os dois valores possíveis, a ler o
header pelo mesmo caminho que todo outro status do repositório — nota
depois do valor tolerada, caixa indiferente — e a expor
`markIntakeConverted`.

O `validate` passa a recusar qualquer outro valor, com a mesma severidade
que já dá a um `Status` inválido numa spec: erro.

O `intake` ganha `--converted`, e o passo 7 do playbook de bootstrap
aponta para ele em vez de mandar editar o arquivo à mão — era o único
cabeçalho de metadado que este framework mandava o agente escrever
manualmente, contra a própria regra dele.

De quebra, a referência dizia que o `intake` sem fonte e sem intake sai
com 1; ele sai com 3. Corrigido nas duas línguas.

Artefatos: `lib/intake-model.js`, `lib/validation-model.js`,
`commands/intake.js`, `.doctrina/templates/playbooks/bootstrap.md.template`,
`docs/{en,pt}/cli-reference.md`,
`packages/doctrina-cli/test/fixtures/playbooks/bootstrap.txt` (recapturado,
com a razão registrada no cabeçalho de `playbooks.test.js` como a change
0145 já fizera),
`packages/doctrina-cli/test/o-status-do-intake-tem-dono.test.js` (novo).

## Scope boundaries

O intake continua fora do `index.json`: ele não é artefato indexado, é o
registro bruto da intenção, e a conversão o aposenta. O que faltava não era
indexá-lo — era ter dono e gate para o único campo dele que comanda algo.

E o `--converted` não desfaz: não existe caminho de volta para `pending`.
Reabrir um intake convertido já tem resposta no `--force`, que recusa e
aponta `intent add` e `work`.

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
- [x] Só os dois valores declarados passam no `validate`, o comando fecha o
      bootstrap e o playbook aponta para ele — provado em
      `packages/doctrina-cli/test/o-status-do-intake-tem-dono.test.js`.

## Open questions

Nenhuma.

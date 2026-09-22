# Change 0157-duas-saidas-fora-do-contrato-de-classe — duas saidas fora do contrato de classe

- **Status:** applied
- **Applied:** 2026-09-22
- **Date:** 2026-09-22
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** cli
- **Documented surface:** n/a — nomeia `--emit`, `--help` e `--version` ao listar quem responde sem árvore; nenhuma flag muda de comportamento cli

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

Percorrida a fronteira inteira — todo comando, fora de um projeto — a
frase `not a Doctrina project (no .doctrina/ in cwd)` saía com três
classes diferentes.

A causa é uma só: o driver de múltiplos ids em
`packages/doctrina-cli/src/commands/change.js` tinha um `catch` que
achatava QUALQUER erro lançado para 1, perdendo a classe que o erro
carrega e a linha de `hint:`. Por isso `change apply|archive|check`
respondiam 1 e `change new`, um braço de `switch` adiante, respondia 3.
Um erro tipado passa a atravessar: ele é uma condição da execução, não um
veredito sobre um id.

Junto vão três caminhos da mesma família: `templates check` e
`templates update` carregavam cópias à mão da mensagem — as últimas duas
do defeito que criou `ensureDoctrinaProject` —, `change.js` guardava uma
sétima cópia privada do próprio helper, e `analyze` perguntava pela
referência antes de perguntar pelo projeto, respondendo `change "x" not
found` num diretório onde não há onde criar change nenhuma.

`hooks install` fora de um repositório git devolvia 1 sem `hint:`: nada
foi medido, a pasta onde o hook mora é que não existe. Agora é precondição
e nomeia `git init`.

E a regra da spec nomeava três exceções quando são sete: `init`, `next`,
`completion`, `ci --emit` e `templates list` respondem a partir do
próprio CLI, sem árvore.

Artefatos: `change.js`, `templates.js`, `analyze.js`, `hooks.js`,
`packages/doctrina-cli/test/a-fronteira-da-precondicao.test.js` (novo),
delta na spec `cli`.

## Scope boundaries

As exceções não mudam de comportamento: quem respondia útil fora de um
projeto continua respondendo. O que muda é a spec passar a declará-las.

E o `catch` do driver continua existindo para os erros NÃO tipados, que
são vereditos de um id só — a correção deixa passar o erro que carrega
classe, não silencia os outros.

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
- [x] Todo comando responde a classe de precondição fora de um projeto, com
      uma frase só, e as exceções declaradas respondem com a saída delas —
      provado em `packages/doctrina-cli/test/a-fronteira-da-precondicao.test.js`.
- [x] Um erro tipado atravessa o driver de múltiplos ids com a classe
      intacta, e um veredito por id continua sendo reportado por id.

## Open questions

Nenhuma.

# Change 0161-o-adapter-nomeia-o-diretorio-nao-o-projeto — o adapter nomeia o diretorio nao o projeto

- **Status:** applied
- **Applied:** 2026-09-23
- **Date:** 2026-09-23
- **Owner:**
- **Lane:** product (confident; signals: add)
- **Affects specs:** scaffolding
- **Documented surface:** n/a — cita `--force` ao explicar por que nenhum arquivo já instalado é reescrito; a flag não muda scaffolding

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

O adapter add nomeia o projeto pelo nome do diretorio em vez do nome registrado: depois de um init com --project-name, todo arquivo de adaptador instalado depois sai com o nome errado, enquanto o init --agent, que tem o nome em maos, sai certo. Sao quatro copias privadas da mesma pergunta espalhadas pelo codigo e uma delas responde diferente das outras tres.

## What

`lib/project.js` — que já é dono da precondição compartilhada — ganha
`projectName(projectRoot, index?)`: o nome registrado, com o diretório de
reserva para uma árvore que não tem nenhum. Aceita um índice já carregado,
para quem tem o valor em mãos não reler nada.

Os dois pontos do `adapter` passam a usá-lo — é aí que estava o defeito.
Junto vão as outras três cópias privadas, incluindo uma função chamada
`projectName` dentro do `constitution`, que é literalmente o helper que
faltava existir num lugar só.

Artefatos: `packages/doctrina-cli/src/lib/project.js`,
`commands/{adapter,constitution,intake}.js`, `lib/{snapshot,scan}.js`,
`packages/doctrina-cli/test/o-projeto-tem-um-nome-so.test.js` (novo).

## Scope boundaries

O `init` continua resolvendo por conta própria: ele é o comando que CRIA o
registro, e a pergunta dele é outra — qual nome gravar, não qual nome foi
gravado. O `templates` também fica: ele repara um registro ausente em vez
de ler um.

Nenhum arquivo de adaptador já instalado é reescrito. O adaptador é aditivo
por contrato e não sobrescreve sem `--force`; quem já instalou com o nome
errado reinstala quando quiser.

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
- [x] Os dois caminhos que instalam adaptador escrevem o mesmo nome, e nenhum
      módulo resolve a pergunta por conta própria — provado em
      `packages/doctrina-cli/test/o-projeto-tem-um-nome-so.test.js`, que
      reprova três dos quatro casos no código anterior.

## Open questions

Nenhuma.

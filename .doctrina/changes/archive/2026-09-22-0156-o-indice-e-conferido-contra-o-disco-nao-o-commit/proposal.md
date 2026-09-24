# Change 0156-o-indice-e-conferido-contra-o-disco-nao-o-commit — o indice e conferido contra o disco nao o commit

- **Status:** applied
- **Applied:** 2026-09-22
- **Date:** 2026-09-22
- **Owner:**
- **Lane:** product (uncertain; signals: add)
- **Affects specs:** scaffolding gates

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

O indice e conferido contra o disco e nunca contra o commit: num commit parcial de uma arvore Doctrina o index.json embarcado lista artefatos que aquele commit nao contem, e o hook de pre-commit regenera do disco e ainda faz git add desse indice. Quatro commits seguidos desta branch foram para o CI com index derivado e o gate de deriva nao viu, porque ele le a arvore de trabalho.

## What

`doctrina index rebuild --check --staged` faz a mesma pergunta da checagem
de deriva ao COMMIT em vez de ao disco: todo artefato que o index staged
nomeia tem de estar no commit, e todo artefato staged tem de estar no
index. Lê por git plumbing — `:<path>` para o blob staged e
`ls-files --cached` para a lista de arquivos que o commit terá.

O hook de pre-commit passa a rodar isso DEPOIS do passo que faz `git add`
do index — antes dele a checagem mediria um commit que o próprio hook
ainda vai mudar.

Artefatos: `packages/doctrina-cli/src/lib/scan.js`,
`packages/doctrina-cli/src/commands/index-rebuild.js`,
`.doctrina/templates/hooks/pre-commit.sample`,
`docs/{en,pt}/cli-reference.md`,
`packages/doctrina-cli/test/o-indice-descreve-o-commit.test.js` (novo).

## Scope boundaries

A sequência do close não muda e nenhum gate do CLI passa a ler o git: o
`validate`, o `index rebuild --check` e o close continuam medindo a árvore
de trabalho, que é o que faz sentido enquanto se trabalha. A pergunta sobre
o commit só existe onde há um commit — no hook.

`--staged` nunca escreve. Sem `--check` é erro de invocação, para que não
exista um caminho que regenere o index a partir do que está staged.

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
- [x] Um commit parcial de `.doctrina/` é recusado e nomeia o que falta, e
      um commit da árvore inteira passa, provado em
      `packages/doctrina-cli/test/o-indice-descreve-o-commit.test.js`.
- [x] O hook instalado faz a pergunta depois de staged o index, provado no
      mesmo arquivo.

## Open questions

Nenhuma.

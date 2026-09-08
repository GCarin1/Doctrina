# Change 0058-a-remediacao-sai-do-projeto-checado — a remediacao sai do projeto checado

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

o gate de docs manda todo projeto adotante documentar em docs/en e docs/pt e cita uma skill que so existe neste repositorio; a remediacao tem que sair do projeto que esta sendo checado

## What

O gate de docs é portável; a instrução que ele imprime não é. Quando recusa, ele
manda documentar em `docs/en` E `docs/pt` e cita a skill `keep-docs-en-pt-parity`,
que só existe neste repositório. Um adotante sem `docs/` e sem português lê que
precisa traduzir.

- A remediação passa a ser derivada do projeto que está sendo checado: os
  diretórios de documentação que ele tem, ou "um README".
- O gate em si não muda — ele já aceita qualquer coisa sob `docs/` ou um README.
- Delta em `specs/gates`.

É a mesma classe do sintoma pt-BR que motivou a change 0047: comportamento
correto para quem escreveu, ilegível para quem adota.

## Scope boundaries

- Não afrouxa nem endurece o gate: só a mensagem muda.
- Não remove a convenção bilíngue deste repositório — ela volta a ser o que
  sempre foi, conselho local, e continua na skill.

## Verification


- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] Num projeto sem `docs/`, a dica não menciona `docs/en`, `docs/pt` nem a skill.
- [ ] Num projeto com `docs/`, a dica nomeia os diretórios que ele tem.
- [ ] Neste repositório a mensagem continua útil para quem mantém os dois idiomas.

## Open questions

- Nenhuma.

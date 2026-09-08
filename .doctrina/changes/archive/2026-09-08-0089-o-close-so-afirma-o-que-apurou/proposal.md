# Change 0089-o-close-so-afirma-o-que-apurou — o close so afirma o que apurou

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

o close conclui com verified archived and validated mesmo quando o passo verify foi pulado por falta de verify.json, e dois passos dizem ok sobre conjunto vazio

## What

Num projeto sem uma única spec, contrato, `verify.json`, critério de aceite ou
âncora de intenção, o close **completa**:

```
──── 7/12 verify
skip   no .doctrina/verify.json — declare the real gate with `doctrina verify --init`
...
✓ change 0002-d closed — verified, archived, and validated.
```

O passo 7 disse, em voz alta, que o gate de build não rodou. A linha final
diz **verified**. Ela é uma string fixa (`close.js:348`), impressa sem olhar
quais passos rodaram, quais foram pulados e quais não tinham o que checar.

Dois passos afirmam sobre o vazio no mesmo caminho:

- **6/12** — `ok every touched spec's Implementation header matches its
  coverage`, com **zero** specs. Universal vacuamente verdadeiro, dito como
  aprovação.
- **2/12** — `ok no accepted ADR cites the touched capabilities`, sem haver
  ADR nenhum.

Em contraste, e é a prova de que o resto do comando sabe fazer certo: o
`verify` pula com nota alta, o `runtime` usa marcador neutro (`·      no
contracts`), e `coverage` e `trace` imprimem a frase honesta. O defeito é a
conclusão que desmente os próprios passos.

O `close` é o gate final do framework e a única coisa que um humano lê quando
aprova. Uma palavra que ele não apurou é a mentira mais cara da árvore.

## Scope boundaries

- Não muda quais passos rodam, nem a ordem, nem os critérios de falha: um
  close que hoje passa continua passando.
- Não transforma um passo pulado em falha: pular o verify por falta de
  `verify.json` continua sendo legítimo e continua saindo 0.

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
- [x] A linha final não afirma um passo que foi pulado.
- [x] Um passo sem o que checar não é reportado como aprovação.
- [x] Um close completo, com todos os passos executados, continua dizendo o
      que sempre disse.

## Open questions

- Nenhuma.

# Change 0092-o-review-nao-aprova-contra-o-que-nao-existe — o review nao aprova contra o que nao existe

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

o review comparado contra uma referencia git que nao existe reporta nenhuma mudanca e sai zero inclusive sob strict, enquanto a mesma arvore comparada contra um ref valido reporta quebras

## What

Numa árvore com duas mudanças reais:

```
$ doctrina review --diff HEAD
2 changed path(s); 1 source file(s) outside .doctrina/.
gap 2 breaks, 1 note

$ doctrina review --diff branch-que-nao-existe --strict ; echo $?
no changes between branch-que-nao-existe and the working tree
0
```

O mesmo no repositório real, contra `origin/nao-existe`: sai 0.

Um ref que o git não resolve é um filtro que não casa nada, e o `review` o lê
como «nada mudou». É o defeito que a change 0090 corrigiu no `--only` do
coverage, num comando diferente e com consequência maior: o `review` é o gate
de conformidade, e roda dentro de todo `close`.

O dano prático não é hipotético. Um job de CI com `doctrina review --diff main
--strict` fica verde para sempre num clone raso — onde `main` não existe
localmente — ou quando o branch padrão do projeto se chama outra coisa. A
falha se parece exatamente com sucesso, que é o modo mais caro de um gate
falhar.

## Scope boundaries

- Não muda o `review` sem `--diff`: a revisão da árvore de trabalho continua
  idêntica.
- Não muda o veredicto de um `--diff <ref>` que resolve: o que hoje reporta
  quebras continua reportando as mesmas.
- Não passa a exigir git: fora de um repositório o comando continua se
  calando em vez de acusar.

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
- [x] Um `--diff` cujo ref o git não resolve deixa de reportar «nenhuma mudança».
- [x] Um `--diff` válido continua reportando exatamente o que reportava.
- [x] Fora de um repositório git o comando continua silencioso, sem acusar.

## Open questions

- Nenhuma.

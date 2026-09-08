# Change 0083-o-trace-nao-aprova-o-vazio — o trace nao aprova o vazio

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

o trace reporta ok sobre zero ancoras de intencao e sai 0 inclusive sob strict, enquanto o doctor lendo a mesma colecao avisa que nenhuma ancora foi declarada

## What

Com zero âncoras de intenção declaradas:

```
$ doctrina trace --strict
ok 0 of 0 intent anchors realized; 0 dropped, 0 dangling, 0 untraceable
$ echo $?
0
```

Com UMA âncora não realizada, o mesmo comando diz `gap ... 1 dropped`. Ou
seja: o verde só existe no estado vazio — que é o estado de todo projeto
recém-criado, e o primeiro número que ele lê sobre si mesmo.

O `doctor`, lendo a mesma coleção, acerta: «no intent anchors declared in
product.md». Duas superfícies sobre um coletor discordando, de novo.

Isto é a metade que a change 0057 não fechou. Ela consertou exatamente este
padrão no `coverage` — zero critérios projetavam 100% — e deixou o `trace`
como estava. A frase da própria change vale palavra por palavra aqui:
ausência não é aprovação.

## Scope boundaries

- Não inventa âncora nenhuma, nem exige que um projeto declare intenção para
  usar o resto do framework: o bootstrap continua começando vazio.
- Não muda o veredicto do `trace` sobre uma árvore que TEM âncoras.

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
- [ ] Zero âncoras deixa de ser reportado como sucesso.
- [ ] O `trace` e o `doctor` dizem a mesma coisa sobre a mesma árvore vazia.
- [ ] Uma árvore com âncoras realizadas continua verde e saindo 0.

## Open questions

- Nenhuma.

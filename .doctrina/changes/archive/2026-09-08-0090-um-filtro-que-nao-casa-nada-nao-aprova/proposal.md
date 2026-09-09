# Change 0090-um-filtro-que-nao-casa-nada-nao-aprova — um filtro que nao casa nada nao aprova

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** gates

## Why

coverage --only com uma capability inexistente mede zero criterios, imprime que nao ha criterio nenhum sob specs quando ha, e sai zero inclusive sob strict

## What

No próprio repositório do Doctrina, que declara **205** critérios de aceite:

```
$ doctrina coverage --only naoexiste --strict
no acceptance criteria found under .doctrina/specs/
$ echo $?
0
```

Duas coisas erradas numa linha. A mensagem afirma que não há critério nenhum
sob `.doctrina/specs/` — há 205. E o modo `--strict`, que existe para ser o
gate de CI, aprova uma medição que não mediu nada.

O dano é o de sempre: um `doctrina coverage --only billing --strict` num
pipeline continua verde para sempre depois de a capability ser renomeada ou
dividida. A falha se parece exatamente com sucesso.

O Doctrina já trata esse caso como erro em outro lugar: o RT05 recusa um
selector de contrato que casa zero alvos, com a razão exata — «a run
dispatched on it executes 0 cases and exits 0». É a mesma frase, aplicada ao
próprio filtro do coverage.

E é a irmã da change 0082: lá o problema era o NOME da flag não existir, aqui
é o VALOR dela não casar nada.

## Scope boundaries

- Não muda o `coverage` sem `--only`: o comportamento sobre a árvore inteira
  continua idêntico.
- Não muda o que `--only <capability-que-existe>` reporta.

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
- [x] Um `--only` que não casa capability nenhuma é reportado como erro de uso.
- [x] A mensagem deixa de afirmar que não há critérios quando há.
- [x] `--only` de uma capability existente continua funcionando igual.

## Open questions

- Nenhuma.

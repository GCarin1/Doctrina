# Change 0091-uma-spec-ativa-declara-como-provar — uma spec ativa declara como provar

- **Status:** proposed
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** validation

## Why

uma spec ativa com a secao de criterios de aceite presente e vazia passa no validate e no coverage --strict, enquanto o clarify falha e o doctor avisa sobre a mesma arvore

## What

Uma spec de 119 linhas, `Status: active`, com requisitos EARS escritos e a
seção `## Acceptance criteria` presente e **vazia**:

| superfície        | veredicto                              |
|-------------------|----------------------------------------|
| `clarify`         | **fail** — 1 smell                     |
| `doctor`          | **warn** — no acceptance criteria declared yet |
| `status`          | no criteria declared (0/0)             |
| `coverage --strict` | **exit 0**                           |
| `validate`        | **ok all validation checks passed**    |

Uma capability que declara o que o sistema DEVE fazer e não declara como
provar que faz. Três superfícies já sabem — a informação está na árvore, e o
`clarify` chega a falhar por ela. Os dois gates que um pipeline roda aprovam.

O gate que decide é o único que não usa a informação que os outros já têm.

A mensagem do `coverage` mente do mesmo jeito que no caso do filtro: «no
acceptance criteria found under `.doctrina/specs/`» quando há uma spec ali,
com a seção presente e sem conteúdo.

## Scope boundaries

- Não exige critério de uma spec em `draft`: uma capability ainda sendo
  desenhada pode não saber como provar nada, e o bootstrap não pode ser
  bloqueado.
- Não muda a forma dos critérios nem o que conta como evidência.

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
- [ ] Uma spec ativa sem critérios deixa de passar no gate estrutural.
- [ ] Uma spec em draft sem critérios continua passando.
- [ ] As superfícies param de discordar sobre a mesma árvore.

## Open questions

- Nenhuma.

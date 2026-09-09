# Change 0087-um-artefato-vazio-nao-passa — um artefato vazio nao passa

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain; signals: spec)
- **Affects specs:** validation

## Why

um artefato vazio passa no validate: spec, proposta de change, contrato, skill e o proprio product.md com zero bytes reportam zero erros, e so o ADR e pego

## What

Esvaziei cada artefato para zero bytes e rodei o gate estrutural:

| artefato esvaziado             | `doctrina validate` |
|--------------------------------|---------------------|
| `specs/<cap>/spec.md`          | ok, 0 erros         |
| `changes/<id>/proposal.md`     | ok, 0 erros         |
| `contracts/<name>.md`          | ok, 0 erros         |
| `skills/<name>.md`             | ok, 0 erros         |
| **`.doctrina/product.md`**     | ok, 0 erros         |
| `decisions/NNNN-*.md`          | **fail, 2 erros**   |

Só o ADR é pego. Uma `spec.md` de zero byte — sem `**Capability:**`, sem
`**Status:**`, sem `**Version:**` — passa limpa, enquanto o AGENTS.md declara
verbatim que a `**Version:**` do arquivo deve igualar a do índice. A checagem
compara header contra índice **quando o header existe**; a ausência dele não
é reportada.

E as superfícies discordam sobre o mesmo arquivo: o índice registra
`status: draft`, o `spec list` mostra `active`, o arquivo não diz nada.

É a terceira aparição do mesmo padrão em lugares diferentes — a change 0057 o
fechou no `coverage`, a 0083 no `trace`, e ele estava no gate estrutural o
tempo todo. Ausência não é aprovação.

## Scope boundaries

- Não inventa conteúdo nem repara artefato: o `validate` continua read-only,
  e `--fix` continua consertando só o que é mecanicamente reparável.
- Não muda o que um artefato BEM formado precisa ter: os headers exigidos
  continuam os mesmos.

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
- [x] Um artefato vazio é reportado como erro, nomeando o arquivo.
- [x] Um artefato bem formado continua passando, sem novo aviso.
- [x] O `product.md` vazio deixa de passar.

## Open questions

- Nenhuma.

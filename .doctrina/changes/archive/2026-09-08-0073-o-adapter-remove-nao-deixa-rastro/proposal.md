# Change 0073-o-adapter-remove-nao-deixa-rastro — o adapter remove nao deixa rastro

- **Status:** applied
- **Applied:** 2026-09-08
- **Date:** 2026-09-08
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** scaffolding

## Why

o adapter remove apaga os seis arquivos do adapter e deixa para tras os diretorios .claude e .claude/commands vazios, e um .claude vazio e uma raiz de configuracao que o agente vai encontrar

## What

O `adapter remove claude` apaga os seis arquivos que o adapter criou e deixa
para trás `.claude/` e `.claude/commands/` — zero arquivos, dois diretórios:

```
$ doctrina adapter remove claude
Adapter claude — 6 files removed
$ find .claude -type f | wc -l
0
$ find .claude -type d
.claude
.claude/commands
```

O comando promete «additive only» e simetria com o `add`. Um `.claude/` vazio não
é neutro: é uma raiz de configuração que o agente vai encontrar e tratar como
existente.

## O critério que já dizia isto e não provava

O critério 1 da spec `scaffolding` afirmava, desde antes desta change, que
«an add/remove round trip returns the tree to its prior state». A evidência
citada exercitava o `gemini` — um adapter de UM arquivo, sem diretório
nenhum. A afirmação era mais larga que a prova, e o único adapter que cria
diretórios (`claude`) nunca passou por ela. O critério continua o mesmo, com
a evidência corrigida e um teste que percorre o caso que faltava.

## Scope boundaries

- Só remove diretório que o próprio adapter criou e que ficou vazio: um
  `.claude/` com arquivos do usuário dentro fica intocado.
- Não muda o que o `add` escreve.

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
- [x] Depois de `add` seguido de `remove`, a árvore volta ao que era.
- [x] Um diretório com conteúdo do usuário sobrevive ao `remove`.
- [x] Um teste percorre `add` e `remove` para um adapter com subdiretórios.

## Open questions

- Nenhuma.

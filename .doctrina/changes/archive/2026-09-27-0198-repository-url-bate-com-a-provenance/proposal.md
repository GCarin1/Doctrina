# Change 0198-repository-url-bate-com-a-provenance — repository url bate com a provenance

- **Status:** applied
- **Applied:** 2026-09-27
- **Date:** 2026-09-27
- **Owner:** Doctrina maintainers
- **Lane:** chore — opened as chore
- **Affects specs:** (none — chore)

- **Documented surface:** n/a — só o manifesto do pacote muda; nenhum comando, flag ou saída do CLI


## Why

O job de release da 0.17.0 passou por todos os gates e foi recusado no
`npm publish`: com `--provenance`, o npm compara o `repository.url` do
manifesto com o repositório que a atestação do GitHub registra
(`https://github.com/GCarin1/Doctrina`), e o manifesto dizia
`gcarin1/doctrina`. A comparação diferencia maiúsculas (E422). O mesmo run
avisou que o npm "auto-corrigiu" o `bin` (`./src/index.js`) e o formato da
URL. Na tentativa anterior a falha tinha sido o token expirado (404),
resolvido no npmjs.com.

## What

- `repository.url` nos dois `package.json` passa a
  `git+https://github.com/GCarin1/Doctrina.git`.
- `bin.doctrina` passa a `src/index.js`; `npm pkg fix` não tem mais nada a
  corrigir.
- Teste `o-manifesto-bate-com-a-provenance.test.js`, que lê a grafia
  canônica da URL de clone do CONTRIBUTING.

## Scope boundaries

- A versão continua 0.17.0: ela nunca foi publicada. A tag `v0.17.0`
  aponta para o commit antigo e precisa ser recriada no commit corrigido.

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

## Open questions


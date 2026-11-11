# Change 0245-o-release-publica-sozinho-quando-a-versao-chega — o release publica sozinho quando a versao chega a main

- **Status:** applied
- **Applied:** 2026-11-11
- **Date:** 2026-11-11
- **Owner:** Doctrina maintainers
- **Lane:** runtime (confident; signals: workflow, tag) — opened as chore
- **Affects specs:** none

- **Documented surface:** n/a — o workflow de release, um script de manutenção e arquivos de configuração do repositório; nenhum comando ou flag do CLI muda


## Why

Duas publicações falharam em três dias pela mesma causa: uma pessoa decidindo, depois do merge, qual commit é uma versão. A tag v0.20.0 foi para um merge feito depois que a 0.20.0 já estava no npm, e a v0.21.0 para um commit cujos exemplos ainda estavam carimbados 0.20.0. Os carimbos da versão vivem em nove lugares e eram conferidos de memória; o `SECURITY.md` dizia `0.16.x` havia cinco versões. Na raiz havia um `close1.txt` commitado por engano, o fim de linha dependia do `core.autocrlf` de cada clone, e uma skill afirmava que `.doctrina/` é CRLF quando só 6 de 1370 arquivos tinham CR.

## What

- `scripts/release.mjs <X.Y.Z>` escreve todo carimbo que cita a versão; `--check` nomeia o que diverge.
- `release.yml`: dispara quando um push na `main` muda o `package.json` do pacote; versão que o npm não tem é conferida, publicada e marcada com a tag pelo próprio job; publica com Node 24.
- Teste na suíte para os carimbos e para a forma do workflow.
- `.gitattributes`: `* text=auto eol=lf` e `CHANGELOG.md merge=union`; `close1.txt` removido; Dependabot mensal agrupado.
- A skill de CRLF passa a `check-the-line-ending-before-patching`; a skill `cut-a-release` descreve o fluxo novo.

## Scope boundaries

A publicação continua usando o segredo `NPM_TOKEN`; a troca por trusted publishing (OIDC) depende de configuração na conta do npm. As actions continuam fixadas por tag. A branch `develop` não é tocada.

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

Nenhuma.

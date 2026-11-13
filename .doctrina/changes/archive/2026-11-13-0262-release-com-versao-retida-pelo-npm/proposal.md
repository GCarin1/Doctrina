# Change 0262-release-com-versao-retida-pelo-npm — release com versao retida pelo npm

- **Status:** applied
- **Applied:** 2026-11-13
- **Date:** 2026-11-13
- **Owner:** Doctrina maintainers
- **Lane:** runtime (confident; signals: workflow, tag) — opened as chore
- **Affects specs:** none


## Why

A release 0.22.0 apareceu como falha no Actions. A execução da `main` passou pelos gates, publicou e marcou `v0.22.0`; a execução disparada pela tag perguntou ao npm, segundos depois, se a versão existia, ouviu que não e publicou de novo, e o npm recusou com E409 "Cannot publish over previously staged version". A versão não aparece no registro porque o npm a reteve em staging: desde julho de 2026 uma publicação feita com token que contorna o 2FA fica à espera de um mantenedor aprovar com 2FA, e em janeiro de 2027 esses tokens deixam de publicar direto. O workflow tratava isso como sucesso numa execução e falha na outra, sem dizer a ninguém que faltava aprovar.

## What

- `.github/workflows/release.yml`: a tag deixa de ser gatilho (é o próprio job que a escreve); uma execução manual numa tag não publica; publicar uma versão que o npm já retém em staging vira aviso, não falha; um passo novo espera até dois minutos a versão ficar pública e, se não ficar, avisa como aprovar (npmjs.com → Staged Packages, ou `npm stage approve <stage-id>`); um passo garante npm 11.5.1 ou mais novo para o trusted publishing (OIDC), que dispensa o token quando configurado no npmjs.com.
- Teste da release cobre: tag não dispara, versão retida é aviso, aviso diz como aprovar, verificação antes da tag, npm 11.5.1.
- Doc de CI EN/PT: a seção do gate de release deixa de dizer que ele dispara numa tag e explica a tag como saída, a versão retida e o trusted publishing.
- Skill `cut-a-release`: passo de conferir o aviso e aprovar a versão retida; não criar tag nem GitHub Release à mão.
- CHANGELOG (Unreleased, Fixed).

## Scope boundaries

Esta change não aprova a 0.22.0 que está retida: isso exige o 2FA do mantenedor no npmjs.com. Ela não configura o trusted publishing, que é uma configuração do pacote no npmjs.com, e não remove o `NPM_TOKEN`, que continua sendo o caminho até o trusted publishing existir. Nenhuma versão é carimbada, então o merge desta change não publica nada.

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

<!-- doctrina:applied-deltas none -->

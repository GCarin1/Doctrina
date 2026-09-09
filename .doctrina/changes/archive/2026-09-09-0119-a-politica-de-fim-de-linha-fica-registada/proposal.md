# Change 0119-a-politica-de-fim-de-linha-fica-registada — a politica de fim de linha fica registada

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (confident; signals: registrar) — opened as chore
- **Affects specs:** (none — chore)

## Why

registrar no registo de adiamentos a decisao sobre politica de fim de linha, com o gatilho que justificaria revisitar e a abordagem alternativa preferida, para nao se perder entre releases
## What

Uma entrada em `docs/en/deferred.md` e `docs/pt/deferred.md` sobre a política
de fim de linha: o estado, por que a correção óbvia não foi a escolhida, a
abordagem preferida quando for revisitada, e o gatilho que a justifica.

Chore: nenhuma spec muda. O `deferred.md` já existe justamente como registo
de escolhas — «para distinguir “não fizemos X” de “considerámos X e estas
são as razões”» — e esta é uma dessas.

O contexto: a change 0117 tornou nove arquivos de teste agnósticos a fim de
linha e a suíte voltou a correr em Windows. A causa-raiz — 519 dos 730
arquivos versionados chegam CRLF porque o repo não declara política —
continua lá. Renormalizar resolveria numa linha e reescreveria 519 arquivos,
o que enterra todo `git blame` seguinte. A alternativa registada é mais
barata: lintar a SUPOSIÇÃO nos testes, e limitar o `.gitattributes` aos
arquivos que algum teste compara byte a byte.

## Scope boundaries

- Não adiciona `.gitattributes` nem normaliza nada. O ponto é registar a decisão, não executá-la.
- Não adiciona o lint proposto: seria a implementação, e esta change é o registo.
- Não toca o CHANGELOG: o `deferred.md` regista escolhas, o Unreleased regista o que vem a seguir.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project’s typecheck/test/build).
- [x] A entrada existe em EN e PT, com estado, alternativa e gatilho.
- [x] `check-docs.js` continua limpo (paridade e teto de linhas).

## Open questions

- Nenhuma.

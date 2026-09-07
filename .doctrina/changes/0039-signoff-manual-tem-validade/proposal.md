# Change 0039-signoff-manual-tem-validade — sign-off manual tem validade

- **Status:** proposed
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

um sign-off manual de verify grava data e nota e vale para sempre mesmo depois que o codigo coberto mudou, e nenhum relatorio distingue prova executada de prova assinada; gravar o SHA e marcar o sign-off como vencido quando o alvo mudou

## What

Um sign-off manual de `verify` passa a ter validade. Hoje `verify --signoff` grava
`{date, note}` em `.doctrina/verify.signoffs.json`, esse arquivo é lido apenas pelo
próprio `verify`, e a assinatura vale para sempre.

- O registro passa a guardar o SHA de HEAD e os caminhos que o check cobre.
- `verify` marca o sign-off como vencido quando algum caminho coberto mudou desde o SHA.
- `status`, `report`, `handoff` e `doctor` passam a distinguir prova executada de prova assinada.
- Delta em `specs/gates`.

Achado F12 da auditoria. É honest gates (ADR 0008) aplicada ao próprio mecanismo de
escape: hoje é o buraco por onde um gate verde pode mentir indefinidamente.

## Scope boundaries

- Não remove o mecanismo de sign-off: um check manual continua sendo legítimo.
- Não infere quais caminhos um check cobre; eles são declarados no `verify.json`, como todo o resto.
- Depende da porta única de git da change 0040 para detectar a mudança — se ela ainda não aterrissou, usar `lib/git.js` diretamente.

## Verification

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] Um sign-off cujo caminho coberto mudou desde o SHA é reportado como vencido.
- [ ] Um sign-off no formato antigo (sem SHA) é tratado pela regra de legado escolhida, e o comportamento é documentado.
- [ ] `status` e `report` mostram a contagem de checks executados versus assinados.

## Open questions

- Sign-off legado sem SHA: tratar como vencido (rigoroso, quebra quem já assinou) ou como válido até a próxima assinatura (compatível, adia o problema)?
- Um sign-off vencido bloqueia o `verify --strict` ou apenas avisa?

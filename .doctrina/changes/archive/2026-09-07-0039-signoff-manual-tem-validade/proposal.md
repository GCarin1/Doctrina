# Change 0039-signoff-manual-tem-validade — sign-off manual tem validade

- **Status:** applied
- **Applied:** 2026-09-07
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
- Depende da porta única de git da change 0040 para detectar a mudança — ela ainda não aterrissou, então usa `lib/git.js` diretamente, como o próprio boundary previa.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um sign-off cujo caminho coberto mudou desde o SHA é reportado como vencido.
- [x] Um sign-off no formato antigo (sem SHA) é tratado pela regra de legado escolhida, e o comportamento é documentado.
- [x] `status` e `report` mostram a contagem de checks executados versus assinados.

## Open questions

- Resolvida (legado): NENHUMA das duas. Um registro sem SHA vira um terceiro
  estado, `unverifiable` — não é confiado (silêncio sobre se a prova ainda vale
  não é prova de que vale) e também não é chamado de vencido, porque ninguém
  sabe que está. É o mesmo padrão que o gate de runtime já usa para uma
  superfície não declarada: UNCHECKED, nunca "passou". Quem já assinou não é
  acusado de nada; uma re-assinatura resolve, e o comando a imprime.
- Resolvida (--strict): avisa por padrão, falha sob `--strict` — exatamente o
  que o `pending` já fazia. Um check manual continua com UMA regra em vez de
  ganhar uma segunda: só passa a assinatura que ainda comprovadamente cobre o
  código; pending, expired e unverifiable se comportam igual entre si.

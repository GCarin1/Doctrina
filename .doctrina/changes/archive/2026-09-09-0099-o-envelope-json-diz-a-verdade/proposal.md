# Change 0099-o-envelope-json-diz-a-verdade — o envelope JSON diz a verdade

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** cli

## Why

o campo command do envelope embute o argumento em vez de nomear so a operacao, contradizendo o contrato que o proprio payload documenta; e uma flag desconhecida junto de json devolve stdout vazio, entao quem pediu JSON recebe erro de parsing em vez de um envelope que diz que recusou
## What

Duas metades do mesmo contrato.

O campo `command` passa a nomear a OPERAÇÃO e as arguments vão para `args`.
Antes, `doctrina why carteira --json` respondia `"command": "why carteira"`,
então o campo pelo qual um consumidor decide tinha um valor diferente para
cada capability — enquanto o `next --json` documenta `command`/`args` como o
contrato. O envelope contradizia o payload que embrulhava. Quem distingue
sub-operação (`spec list`) de argumento (`why carteira`) é o catálogo, não a
forma: reuso o `operationOf` que o `lib/usage.js` já usa pelo mesmo motivo.

E uma flag desconhecida com `--json` passa a devolver envelope. A change 0086
fez o envelope dizer a verdade sobre o código de saída; a recusa de flag
corre ANTES de o envelope existir, então quem pediu JSON recebia stdout vazio
e um erro de parsing em vez de `{ok: false, exit_code: 2}`.

Terceira auditoria, achados 6 e 7.

## Scope boundaries

- Não muda os comandos que já constroem payload próprio: eles sempre passaram só a operação.
- `args` só aparece quando há argumentos, para um consumidor poder ramificar na presença em vez de num array vazio.
- Não toca as outras portas de recusa do entrypoint (comando desconhecido, `--help`), que não prometem JSON.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um argumento aparece em `args` e nunca em `command`.
- [x] Uma sub-operação continua inteira em `command`, sem `args`.
- [x] Uma flag desconhecida com `--json` devolve envelope com `ok:false` e `exit_code:2`, dizendo o que recusou.
- [x] `ok` e `exit_code` concordam com o processo, recusa incluída.

## Open questions

- Isto muda o payload para quem lia `command` como a invocação inteira. É 0.x e o campo passa a cumprir o que o `next --json` já documentava, mas fica registado como mudança de contrato para a nota de versão.

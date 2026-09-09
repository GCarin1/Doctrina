# Change 0096-o-ledger-registra-o-que-aconteceu — o ledger registra o que aconteceu

- **Status:** applied
- **Applied:** 2026-09-09
- **Date:** 2026-09-09
- **Owner:**
- **Lane:** product (uncertain)
- **Affects specs:** authoring

## Why

um apply forcado grava no ledger que atravessou os bloqueadores mesmo quando nada foi escrito e a proposta continua proposed, entao a fonte legivel da historia afirma um evento que nao ocorreu
## What

`enforceTransition` deixa de gravar no ledger e passa a devolver
`{ ok, forced }`. Quem conduz a transição grava a lacuna DEPOIS de ela ter
acontecido: o `apply` quando escreveu sem erros, o `archive` depois de a
pasta se ter movido.

Terceira auditoria, achado 3. Reproduzido por execução: um `apply --force`
sobre uma change com bloco ops inaplicável gravava «forced apply past 3
blockers» enquanto escrevia zero, a spec ficava byte a byte igual e a
proposta continuava `proposed`. O ledger é a fonte legível do que aconteceu
à árvore; uma tentativa que não mudou nada não lhe aconteceu.

O que NÃO muda: `--force` continua a dispensar a precondição e não a
operação, então um apply forçado ainda falha no mesmo delta malformado.
Isso está certo — o gate promete o que é verificado antes de começar, não
que o trabalho vai correr bem.

## Scope boundaries

- Não muda o formato da linha do ledger nem o que `recordForcedGap` escreve; muda apenas QUANDO é chamada.
- Não regista a tentativa falhada sob outra forma. Uma segunda linha «tentou e falhou» seria ruído por um não-evento, e o estado real já está visível: a proposta continua `proposed` e a spec intacta.
- Não toca `change abandon`, que grava a sua própria linha e cuja operação não falha a meio.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] Um `apply --force` que falha não deixa reivindicação no ledger, e a spec e a proposta provam que nada aconteceu.
- [x] Um `apply --force` que tem sucesso continua a registar a lacuna, nomeando o gate dispensado.
- [x] Um `archive --force` só regista depois de a pasta se ter movido.
- [x] Uma transição limpa não escreve linha de lacuna nenhuma.

## Open questions

- O teste de paridade de gates fixava a gravação incondicional. Reescrevi-o para amarrar o registo ao RESULTADO (`recorded === (status === 0)`), o que é a versão mais afiada da mesma pergunta. Se alguém quiser mesmo um rasto das tentativas falhadas, é outra change e outro lugar — não o ledger.

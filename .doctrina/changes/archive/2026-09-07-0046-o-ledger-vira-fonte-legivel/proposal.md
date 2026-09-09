# Change 0046-o-ledger-vira-fonte-legivel — o ledger vira fonte legivel

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** gates

## Why

o LEDGER.md e um log estruturado de data, id, titulo e specs afetadas lido por apenas dois consumidores enquanto metrics deriva tudo do git que nao sabe nada de capacidades; escrever um parser e ligar o ledger ao report, ao review e ao escopo por dependentes

## What

O `LEDGER.md` deixa de ser um arquivo que só duas coisas leem. Cada linha carrega data,
id, título e specs afetadas com a operação — um log de eventos de domínio que hoje só
`decision scope` e um cross-check do `validate` consomem.

- Novo `src/lib/ledger.js`: parser tolerante a linhas livres (o contrato é que o CLI só faz append; humanos editam).
- `report` ganha churn por capacidade no período.
- `review` usa o churn como sinal ("esta spec mudou 9× em 60 dias").
- `close` amplia o escopo do coverage para os dependentes diretos da capacidade tocada, no nível consultivo.
- Delta em `specs/gates`.

Achados F13 e F14 da auditoria.

## Scope boundaries

- O CLI continua apenas fazendo append no ledger; o parser nunca reescreve.
- O escopo por dependentes entra como consultivo: alargar o gate reintroduz o problema que o escopo resolveu.
- `metrics` continua derivando do git nesta change; unificar as duas fontes é a change 0050.
- A linha de docs gap passa a ser escrita na gramática de entrada do ledger
  (antes era prosa solta): um gate dispensado que nenhum leitor encontra
  equivale a um gate dispensado que ninguém registrou. Nenhuma linha
  histórica foi reescrita.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] O parser lê o ledger deste repositório inteiro sem erro, incluindo as linhas de abandono e de docs gap.
- [x] Uma linha editada à mão fora do formato é ignorada, não derruba o parser.
- [x] `report` mostra o churn por capacidade e `close` lista os dependentes como aviso.

## Open questions

- **O churn é risco ou saúde? — Resolvido: nenhum dos dois, e é exatamente
  por isso que o número vai sem veredito.** A pergunta já contém a resposta:
  as duas leituras são plausíveis e nada que a CLI consegue medir distingue
  uma da outra. Uma spec que aterrissou 19 changes pode estar mal desenhada
  ou pode ser onde o trabalho está; decidir isso é semântico, e semântica é
  do agente (ADR 0005). Então o `review` reporta a contagem, a janela e a
  data da última — e diz na própria linha que é história, não veredito ("leia
  como 'esta área está se movendo', não 'esta área está errada'"). Duas
  consequências práticas: a linha entra como NOTA e nunca como break, então
  não move o exit code nem sob `--strict`; e existe um piso (3 changes em 60
  dias) para que a nota apareça só quando há algo a notar — um número que
  aparece sempre é ruído, e ruído é o que fez o `review` ser advisory na
  change 0041.
- **Por que o escopo por dependentes fica consultivo?** Porque o escopo
  existe para o problema inverso. O coverage do `close` foi restringido às
  capabilities tocadas justamente para que uma spec adiada em outro canto da
  árvore não bloqueie uma change que nunca chegou perto dela (revisão de
  campo 0.11.0, item 4). Ampliar o gate até os dependentes devolveria esse
  problema com outro nome. Nomear os dependentes e mostrar a cobertura deles
  dá ao agente exatamente o que ele precisa — "esta change mexeu no chão de
  outra coisa, e olha como essa outra coisa está provada hoje" — sem
  transformar isso em recusa.

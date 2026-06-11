# Gating

> Tradução da [versão em inglês](../en/gating.md). O inglês é a
> fonte de verdade; este arquivo o segue.

O pipeline Doctrina é overhead. Este doc te diz quando ele
compensa e quando não.

## A pergunta-gatilho

> "Eu ficaria irritado se o agente interpretasse os requisitos de
> forma diferente do que eu quis dizer?"

Se a resposta é sim, você quer uma spec. Se não, não. Essa única
pergunta substitui o checklist na maior parte das vezes.

## Gatilhos concretos

O ciclo completo (abrir change → escrever delta → aplicar →
arquivar) compensa quando **qualquer** um destes vale:

- O trabalho toca uma capability coberta por spec existente.
- O trabalho muda comportamento observável para usuários ou
  outros sistemas.
- O trabalho tem mais de uma implementação plausível e você
  quer que o agente escolha uma e mantenha.
- O trabalho cruza uma fronteira de subsistema ou afeta uma
  interface.
- O trabalho introduz ou muda uma dependência.
- O trabalho tem implicações de segurança ou compliance.

O ciclo completo **não** compensa para os cinco cenários abaixo
que a literatura de SDD (marmelab, Augment, arXiv:2602.00180)
converge como ROI-negativo para cerimônia de spec:

1. **Protótipos descartáveis.** Código que você vai jogar fora em
   uma semana.
2. **Projetos solo de curta duração.** Sem segundo leitor, sem
   você-futuro para agradecer.
3. **Código exploratório.** Spikes cujo objetivo é aprender, não
   entregar.
4. **Fixes de uma linha.** Typos, formatação, bugfix de uma linha,
   renomeações mecânicas de campos privados.
5. **CRUD óbvio.** Boilerplate cuja forma é ditada inteiramente por
   um schema, sem julgamento.

Em qualquer um desses casos: escreva o código, rode os testes,
commite. Sem proposal, sem delta, sem archive.

A regra de bolso que a pesquisa destila: **use o mínimo de rigor de
spec que remove a ambiguidade no seu contexto**. Mais estrutura por
si só produz a burocracia que este doc alerta.

## Quando escrever um ADR

Abra um ADR (independente de qualquer change) quando a decisão é:

- Difícil de reverter (engine de banco, topologia de deploy,
  shape de API pública).
- Arquiteturalmente significativa (modelo de concorrência,
  ownership de dados, estratégia de autenticação).
- Uma escolha que o próximo leitor reabriria do zero.

**Não** escreva um ADR para:

- Detalhes de implementação que aparecem no código (nomes de
  variável, estruturas de dados internas).
- Decisões que já vivem numa spec.
- Decisões que você não se daria ao trabalho de explicar a um
  colega novo.

Regra de bolso: se você escreveria um post interno sobre, é um
ADR.

## Quando atualizar `product.md`

Atualize `product.md` quando o escopo, usuários-alvo ou
não-objetivos do projeto mudam. Bug fixes e features pequenas
não mexem em `product.md`; pivots mexem.

## Quando refatorar os docs

Refatore os docs quando um doc existente foi lido por você ou por
um agente e produziu ação errada. Se ninguém esbarra, ninguém
conserta. O `doctrina validate` não checa frescor de doc — humanos
checam, por revisão de PR e pela pergunta-gatilho acima.

## Antipattern: gating em tudo

O ponto do Doctrina é reduzir surpresas, não fabricar cerimônia.
Times que rodam o pipeline completo em todo commit produzem o
documentation theater que ADR 0003 alertou. Se `doctrina validate`
é a única coisa mantendo artefatos em sincronia com a realidade,
os artefatos não estão puxando o peso.

A disciplina pragmática:

1. Por padrão, pule.
2. Abra um change só quando a pergunta-gatilho dispara.
3. Mantenha specs curtas, densas, atuais.
4. Arquive proposals rápido.

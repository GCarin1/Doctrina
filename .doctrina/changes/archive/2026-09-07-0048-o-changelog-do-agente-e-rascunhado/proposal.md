# Change 0048-o-changelog-do-agente-e-rascunhado — o changelog do agente e rascunhado

- **Status:** applied
- **Applied:** 2026-09-07
- **Date:** 2026-09-07
- **Owner:**
- **Affects specs:** templates

## Why

o changelog voltado ao agente e um objeto literal editado a mao a cada release em paralelo com um changelog de prosa de 57 kilobytes, e o proprio comentario admite que a abordagem nao escala; rascunhar os candidatos a partir dos sinais de superficie que o docs-impact ja extrai

## What

O bloco `AGENT_CHANGELOG` deixa de ser descoberto de cabeça. Hoje é um objeto literal em
`src/lib/commands.js` que alguém edita a cada release, em paralelo com o `CHANGELOG.md`
de 57 KB que descreve as mesmas mudanças em prosa.

- Novo `report --agent-changelog`: propõe bullets a partir de `documentedSurfaceSignals()`, que já extrai comandos, flags e códigos de saída tocados por cada change arquivada.
- A autoria segue humana: o comando propõe, alguém corta e reescreve.
- `upgrade --write` continua sendo quem escreve o bloco no AGENTS.md.
- Delta em `specs/templates`.

Achado F22 da auditoria. O comentário no próprio código já admite que a abordagem
"funcionou uma vez e não escala, porque o terceiro patch silenciosamente derruba uma
linha para caber no teto".

## Scope boundaries

- Não gera o `CHANGELOG.md` de prosa: são públicos diferentes e o de prosa é humano.
- Não escreve no `AGENT_CHANGELOG` automaticamente: propõe candidatos.
- Respeita o teto de cinco bullets, que existe porque o AGENTS.md tem orçamento de linhas.

## Verification

- [x] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [x] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [x] `report --agent-changelog` propõe bullets a partir das changes arquivadas na janela.
- [x] A proposta respeita o teto de cinco bullets e ordena do mais novo para o mais antigo.
- [x] Uma change que não toca superfície documentada não gera bullet.

## Open questions

- **Agrupar por versão? — Resolvido: nem inferir por tag, nem registrar no
  arquivamento. O rascunho é para UMA versão: a que você está cortando.**
  As duas opções da pergunta partem do mesmo pressuposto errado, o de que a
  change pertence a uma versão no momento em que é arquivada. Ela não
  pertence: uma change é arquivada dias antes de alguém decidir se a próxima
  release é patch ou minor, então registrar a versão no arquivamento seria
  gravar algo que ainda não é verdade — e inferir pela data da tag é
  adivinhação sobre um arquivo (o ledger) que o próprio projeto convida
  humanos a editar. O que É determinístico: a última tag marca onde a
  release anterior terminou, então tudo arquivado depois dela é candidato à
  próxima. O rascunho usa essa janela por padrão, imprime o bloco já com a
  chave da versão em execução (`cliVersion()`), e DIZ qual janela usou — sem
  tag, cai numa janela de 30 dias e declara isso. Nenhum agrupamento
  retroativo, nenhum campo novo no ledger.
- **Por que não escrever o bloco direto?** Porque o bullet útil não é
  extraível. O rascunho sabe qual superfície a change tocou (o gate de docs
  já extrai comandos, flags e códigos de saída); o que um agente precisa
  fazer diferente é juízo sobre comportamento, e a CLI não faz juízo (ADR
  0005). Um bloco gerado leria "0054-split-cli-into-cli-and-authoring
  (commands: change, contract, ...)", que é verdadeiro e inútil. Então a
  saída é o literal pronto para colar, com os candidatos ordenados e
  cortados no teto, e a instrução explícita de reescrever cada linha.

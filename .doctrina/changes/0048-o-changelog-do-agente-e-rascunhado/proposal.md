# Change 0048-o-changelog-do-agente-e-rascunhado — o changelog do agente e rascunhado

- **Status:** proposed
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

- [ ] Automated checks pass (`doctrina verify`, or the project's typecheck/test/build).
- [ ] The affected spec's acceptance criteria are met and cite their evidence (`doctrina coverage`).
- [ ] `report --agent-changelog` propõe bullets a partir das changes arquivadas na janela.
- [ ] A proposta respeita o teto de cinco bullets e ordena do mais novo para o mais antigo.
- [ ] Uma change que não toca superfície documentada não gera bullet.

## Open questions

- Agrupar por versão exige saber qual release levou cada change. O ledger tem a data, não a versão — inferir pela data da tag ou passar a registrar a versão no arquivamento?

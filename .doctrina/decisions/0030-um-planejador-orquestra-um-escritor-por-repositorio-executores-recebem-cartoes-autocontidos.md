# ADR 0030 — Um planejador orquestra, um escritor por repositório; executores recebem cartões autocontidos

- **Status:** accepted
- **Scope:** cli, delivery, workspace
- **Date:** 2026-11-03
- **Deciders:** project owner
- **Supersedes:** 0004
- **Superseded by:** —
- **Evidence:** `packages/doctrina-cli/src/lib/delivery.js`, `packages/doctrina-cli/src/lib/task-card.js`, `.doctrina/templates/playbooks/delivery.md.template`
- **Landed:** —

## Context

O ADR 0004 escolheu um único orquestrador linear: subagentes só para
leitura, papéis como personas em sequência, e nunca dois agentes escrevendo
o mesmo artefato. A evidência que o sustentava continua de pé — o texto
*Don't Build Multi-Agents* da Cognition, e a própria Anthropic dizendo que
a orquestração multiagente rende menos em tarefas interdependentes como
código e custa perto de 15 vezes mais tokens.

Duas coisas mudaram. Primeiro, o trabalho passou a atravessar repositórios
(ADR 0029): uma tela nova mexe no `back-end`, no `front-core` e no
`front-feature`, e esses repositórios NÃO compartilham arquivos — o risco
de decisões implícitas conflitantes vive dentro de um repositório, não
entre eles. Segundo, os agentes ganharam subagentes com modelo próprio
(Claude Code: `model:` no frontmatter de `.claude/agents/`; Cursor:
`.cursor/agents/` e `.claude/agents/`), o que torna barato o padrão
planejador/executor do Aider (*architect* forte, *editor* menor).

O que o 0004 temia é o executor sem o contexto: um subagente não vê a
conversa do planejador (a documentação do Claude Code diz isso
literalmente). O BMAD resolveu com o *story file* — e o próprio 0004 já
admitia emprestar essa ideia.

## Decision

1. **Um planejador** — o agente da sessão, no modelo mais capaz — lê a
   história, roteia a entrega, abre uma change por repositório, escreve o
   delta e os cartões de tarefa, revisa e FECHA. Só ele fecha uma change
   ou uma entrega.
2. **Executores** recebem um cartão por vez (`doctrina change card`): a
   tarefa e as linhas indentadas sob ela (`Files:`, `Requirement:`,
   `Verify:`), o Why da change e a spec recortada para a tarefa. O cartão é
   o contexto inteiro do executor; um cartão que precisa da conversa não
   está terminado.
3. **Um escritor por repositório.** Dois agentes nunca escrevem no mesmo
   repositório ao mesmo tempo. Repositórios diferentes de uma entrega podem
   avançar em paralelo, porque não compartilham artefatos.
4. Subagentes de leitura continuam livres, como no 0004.
5. O CLI não chama modelo nem agente: ele escreve os cartões e o roteiro;
   quem delega é o agente (ADR 0005).

## Alternatives considered

1. **Manter o 0004 e um único agente fazendo tudo.** Continua válido para
   uma change num repositório, e continua sendo o padrão: nada obriga a
   delegar. Rejeitado como regra única porque ignora entregas entre
   repositórios e o custo de um modelo forte digitando código mecânico.
2. **Enxame paralelo (claude-flow, *agent teams*).** Rejeitado para
   escrita: os próprios guias pedem que cada colega tenha arquivos
   diferentes, o que no Doctrina já é o repositório.

## Consequences

- Uma entrega entre repositórios tem dono, roteiro e estado (`delivery`).
- O custo cai quando o executor usa um modelo menor; a métrica que diz se
  compensa é o retrabalho que o planejador rejeita na revisão.
- Num agente sem subagente com modelo próprio, o mesmo roteiro roda em
  sequência na mesma sessão — o cartão continua sendo a unidade.

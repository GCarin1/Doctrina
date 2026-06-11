# Antipatterns

> Tradução da [versão em inglês](../en/antipatterns.md). O inglês é
> a fonte de verdade; este arquivo o segue.

Modos de falha que Doctrina viu, nomeou e decidiu contra. A maioria
está documentada em ADRs; este doc é o resumo legível e
cross-linkado.

## 1. Documentation theater

O time produz proposals, deltas e ADRs num ritmo que casa com
cerimônia de Jira em vez de decisões reais. Em um trimestre,
ninguém lê. Em um ano, metade descreve código que não existe
mais.

**Reconheça por:** comentários de PR perguntando "ainda precisamos
desta spec?" ou commits que atualizam a spec sem ninguém ler.

**Evite com:** [gating.md](gating.md). Se a pergunta-gatilho não
dispara, pule o proposal. Mantenha `doctrina validate` no
pre-commit pra drift ser detectado, não acumulado.

## 2. Curadoria automática de memória

Deixar um agente escrever numa pasta `memory/` sem gate humano. A
pasta incha. Lições obsoletas competem com verdade atual. O LLM lê
mais contexto de baixa densidade em cada turno, custos sobem,
qualidade cai.

**Reconheça por:** uma pasta `memory/` (ou similar) cujas entradas
não são citáveis em revisões de PR.

**Evite com:** ADR 0003 — sem `memory/` no v0 ou v1. Promova
lições duráveis para specs ou ADRs. Se uma lição não merece
nenhum dos dois, não merece ser persistida.

## 3. Escritores multi-agente em paralelo

Dois agentes (um Dev e um QA, um Architect e um Coder, etc.)
escrevendo no mesmo artefato ao mesmo tempo, cada um com contexto
parcial. Eles tomam decisões implícitas conflitantes. O resultado
faz merge incoerente.

**Reconheça por:** specs com duas estruturas competindo, ou deltas
que se contradizem no mesmo change.

**Evite com:** ADR 0004 — orquestrador único e linear. Subagentes
paralelos são OK para investigação read-only; nunca para escrita
em artefatos compartilhados. Veja [multi-agent.md](multi-agent.md)
para o modelo construtivo que substitui esse pattern.

## 4. Editar um ADR aceito

Alguém "ajusta" um ADR antigo pra refletir o que o sistema agora
faz. A história da decisão é silenciosamente sobrescrita.
Leitores futuros não conseguem saber qual versão da decisão foi
de fato tomada quando, por quem.

**Reconheça por:** diffs no corpo de um ADR com `Status: accepted`
(qualquer coisa fora dos headers `Status:` e `Superseded by:`).

**Evite com:** `doctrina decision supersede`. O ADR antigo
mantém o corpo; o ADR novo registra o que mudou. O Status é a
única parte mutável.

## 5. Inchar AGENTS.md

`AGENTS.md` acumula prosa, conteúdo de tutorial, histórico do
projeto. Passa de 300, 500, 800 linhas. A penalidade
lost-in-the-middle entra e agentes começam a ignorar regras
críticas enterradas no meio.

**Reconheça por:** contagem de linhas > 200 (`doctrina validate`
avisa em > 150, erra em > 200).

**Evite com:** mantenha AGENTS.md com comandos, convenções,
fronteiras e ordem de leitura. Mova tudo o mais para `docs/`,
specs ou ADRs.

## 6. Tratar o archive como verdade viva

Agentes ou humanos leem `changes/archive/` para entender "como
as coisas funcionam hoje". Premissas obsoletas vazam para
trabalho novo.

**Reconheça por:** commits ou comentários de PR que citam um
change arquivado como autoridade.

**Evite com:** a regra cozida no AGENTS.md — o archive está fora
do caminho de leitura padrão. Se você precisa saber como uma
capability **costumava** ser, o archive é onde olhar. Se precisa
saber como ela **é hoje**, leia a spec.

## 7. Spec sem critério de aceitação

Uma spec lista requisitos mas não diz como saber que foram
satisfeitos. O agente escreve código que "parece certo" e não
há verdade de chão pra empurrar de volta.

**Evite com:** todo template de spec termina com seção
`Acceptance criteria`. Preencha com sinais observáveis e
verificáveis — contagens, exit codes, comportamento, não
adjetivos.

## 8. Pular a pergunta-gatilho

O time abre um change pra todo commit porque "agora somos um time
SDD". Cerimônia explode, throughput despenca, a prática leva a
culpa e é abandonada.

**Evite com:** [gating.md](gating.md). A pergunta-gatilho é uma
frase. Aplique. Pule quando não dispara.

## 9. Traduzir specs para outras línguas

Um contribuidor bem-intencionado traduz
`.doctrina/specs/billing/spec.md` para PT. Os dois arquivos
divergem. Agora você tem um problema de ambiguidade de spec.

**Evite com:** a spec de docs — só `docs/` é traduzido, nunca
specs ou ADRs. Specs e ADRs ficam em EN, ponto.

## 10. Refinamento iterativo sem review de segurança

Deixar um agente refinar o mesmo código gerado por muitas
iterações de "polish" sem rodar scan de segurança entre as rodadas.
O estudo arXiv:2506.11022 mediu **+37,6% de aumento em
vulnerabilidades críticas após apenas cinco iterações** de
refinamento conduzido por LLM. Cada passada de polish
plausivelmente melhora legibilidade enquanto silenciosamente
introduz ou aprofunda defeitos de segurança (validação de input
faltando, escopos ampliados, segredos vazados, auth enfraquecido).

**Reconheça por:** código onde o sétimo commit de "ajuste pequeno"
adiciona uma vulnerabilidade que o primeiro commit não tinha, e o
diff é barulhento demais para pegar a olho.

**Evite com:** faça a fase de Review/Verify (veja
[multi-agent.md](multi-agent.md)) rodar um scan de segurança como
uma das suas tarefas de subagente read-only em toda iteração, não
só no final. Para áreas de alto raio de impacto (auth, billing,
migrations), exija uma passagem explícita de segurança antes do
change ser arquivado.

## 11. Alcançar vector store cedo demais

O projeto tem algumas centenas de arquivos. Alguém propõe
adicionar RAG ou vector store pra "ajudar o agente a achar
coisas". O runtime fica mais pesado, retrieval vira black box, e
o time gasta semanas em tuning de relevância em vez de features.

**Evite com:** arquivos em git são fonte de verdade para v0 e v1.
Alcance retrieval só quando o corpus de specs ultrapassar o que
cabe no contexto útil do agente (tipicamente centenas de milhares
de tokens de verdade ativa) **e** quando medição diga que
lookup é o gargalo. Até lá, o custo de "lost in the middle" bate
o custo de opacidade de recall.

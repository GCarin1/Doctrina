# Doctrina vs outros frameworks SDD

> Tradução da [versão em inglês](../en/comparison.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Posicionamento honesto do Doctrina contra os cinco frameworks de
desenvolvimento spec-driven mais citados em 2025–2026. Números e
afirmações sobre outras ferramentas vêm da pesquisa-fonte e da
documentação pública dos projetos; nada é inventado.

## Visão geral

| Dimensão | Doctrina | Spec Kit | AWS Kiro | OpenSpec | BMAD-METHOD | SpecWeave |
|----------|:--------:|:--------:|:--------:|:--------:|:-----------:|:---------:|
| Distribuição | npm zero-deps | Python CLI | Fork IDE | npm | YAML + MD | npm |
| Tempo de setup | < 5 min | ~30 min | Instalar IDE | ~5 min | Alto | Médio |
| AGENTS.md nativo | sim | via adapter | não (steering) | sim | não | sim |
| Requisitos EARS | guiado por template | não | nativo | parcial | não | opcional |
| ADRs imutáveis + supersede | sim (comando) | não foco | parcial | sim (schema) | não | parcial |
| Postura multi-agente | orquestrador linear único (doc) | implícito | implícito | implícito | por papel (rejeitado) | flexível |
| Greenfield | forte | excelente | excelente | forte | forte | forte |
| Brownfield | forte (guia dedicado) | fraco (pesquisa) | parcial | forte (first-class) | parcial | forte |
| Quality gates shipped | analyze + clarify + validate | clarify + checklist + analyze | hooks on-save | validate | nenhum built-in | validate |
| Instalador pre-commit | sim | não | n/a | não | não | não |
| Detecção de stale-reference | sim | não | parcial | não | não | não |
| Protocolo A/B empírico shipped | sim (spec + doc) | não | não | não | não | não |
| Docs bilíngues | EN + PT | EN | EN | EN | EN | EN |
| Agentes nativos | 12 | 30+ | IDE próprio | 5+ | vários | muitos |
| Examples reais shipped | em repo | sim | sim | sim | sim | sim |
| Tamanho da comunidade | muito pequena | apoiado pela Microsoft | apoiado pela AWS | crescendo | crescendo | crescendo |

## Onde Doctrina está acima do campo

- **Brownfield é first-class.** Doctrina ship um guia dedicado
  de adoção brownfield que transforma a regra de spec
  just-in-time, ADRs retroativos e validate/clarify-como-onboarding
  num runbook. Outros frameworks tratam brownfield como "o mesmo
  que greenfield, mas mais difícil". Doctrina nomeia a diferença.
- **Validação empírica é shippada, não só pregada.** A spec de
  capability `validation` define sete métricas obrigatórias (as
  quatro do DORA mais rework rate, custo-por-feature, tempo de
  review de PR) e quatro triggers de decisão pré-declarados. O
  doc operacional traduz a spec num procedimento de quatro passos
  que um time pode rodar com uma planilha. Nenhum outro
  framework aqui ship o protocolo.
- **Detecção de stale-reference.** `doctrina validate` caminha
  por toda spec e ADR procurando links Markdown apontando para
  arquivos que não existem mais. Os outros validators desse
  espaço pegam erros de schema mas não rot silencioso.
- **Orquestrador linear único é argumentado, não assumido.** O
  doc multi-agente nomeia a topologia por papel do BMAD, cita
  os achados de Cognition e Anthropic contra ela para trabalho
  de código, e documenta as cinco personas-fase de workflow que
  substituem escritores paralelos. O raciocínio é portátil; o
  doc é reusável fora do Doctrina.
- **Zero dependências de runtime, sempre.** O CLI importa só
  módulos da biblioteca-padrão do Node.js. Sem superfície de
  cadeia de suprimentos, sem latência de instalação, sem ruído
  de audit. Os outros frameworks distribuídos via npm carregam
  deps transitivos.
- **Documentação bilíngue EN + PT.** Onze docs em cada idioma.
  Os outros frameworks são English-only.

## Onde Doctrina está em paridade

- **Adoção do AGENTS.md.** OpenSpec, SpecWeave e Doctrina honram
  o padrão aberto. Kiro e BMAD não; Spec Kit via adapter.
- **Workflow de ADR.** OpenSpec ship um schema custom de ADR ao
  lado de specs; Doctrina ship ADRs como artefatos first-class
  com comando `supersede`. Equivalentes em intenção, diferentes
  em API.
- **Pasta de change com deltas.** OpenSpec e Doctrina ambos usam
  semântica de delta ADDED / MODIFIED / REMOVED. O CLI do
  Doctrina recusa fazer auto-merge de MODIFIED para parar
  decisões implícitas; isso casa com a postura do OpenSpec.
- **EARS para requisitos.** Kiro é nativo; Doctrina é
  guiado-por-template. Ambos fazem EARS a gramática recomendada.
- **Constituição / princípios vigentes.** Spec Kit ship um
  `constitution.md` escrito à mão. Doctrina monta a mesma visão
  sob demanda com `doctrina constitution` — os ADRs aceitos mais
  os non-goals do produto — para que os inegociáveis tenham uma
  leitura única sem uma segunda casa para os fatos. Equivalente
  em intenção; Doctrina deriva, Spec Kit escreve.
- **Comandos de fluxo dentro do agente.** Spec Kit expõe
  `/specify`, `/plan`, `/tasks`. Os adapters `claude` e `cursor`
  do Doctrina instalam `/doctrina-work`, `/doctrina-next`,
  `/doctrina-context`, `/doctrina-status` e `/doctrina-why`, cada
  um um prompt fino sobre a CLI.

## Onde Doctrina está abaixo do campo

- **Suporte nativo a agentes.** Doctrina ship adapters para
  Claude Code, OpenAI Codex CLI e Cursor. Spec Kit é reportado
  integrando com 30+ agentes; SpecWeave anuncia 100+ skills para
  uma gama ampla de ferramentas. A superfície de agentes do
  Doctrina é deliberadamente pequena mas é concretamente menor
  que os líderes.
- **Projetos exemplo do mundo real.** Spec Kit, Kiro, OpenSpec e
  BMAD todos ship projetos exemplo que adotantes externos podem
  copiar. Em v0.1.0, Doctrina ship o próprio repositório
  auto-descrito mais dois projetos exemplo em `examples/`; os
  líderes ship dezenas.
- **Comunidade.** Doctrina tem efetivamente zero contribuidores
  externos no v0.1.0. Spec Kit tem suporte Microsoft, Kiro tem
  AWS, outros têm seguidores crescendo. Isso é função de idade,
  não de design.

## O que Doctrina explicitamente não busca ser

- Um novo runtime de agentes. Doctrina é o substrato que Claude
  Code, Codex CLI, Cursor e qualquer ferramenta futura
  AGENTS.md-aware leem; nunca substitui o agente em si.
- Uma ferramenta de workflow monorepo. Doctrina não rastreia
  velocity, burndown, assignees ou cadência de sprint. Use ao
  lado dessas ferramentas, não em vez delas.
- Um substituto de project-management. Specs e ADRs não são
  tickets. A pasta de change é uma unidade de trabalho, não um
  cartão Jira.
- Um ranqueador de grafo de código. A abordagem
  tree-sitter + PageRank do Aider é a implementação canônica;
  Doctrina aplica o mesmo princípio no nível dos artefatos via
  ordem de leitura e caps de tamanho, e não ship um ranqueador.

## Escolhendo entre Doctrina e outro framework

Use **Doctrina** quando:

- Você quer zero dependências de runtime.
- Você está adotando num codebase brownfield.
- Você quer o protocolo A/B empírico shipped na caixa.
- Documentação bilíngue EN + PT importa.
- Sua superfície de agentes cabe nos doze agentes suportados.

Use **Spec Kit** quando:

- Você precisa de integração com um dos 30+ agentes que Doctrina
  ainda não suporta.
- Suporte Microsoft é parte da história de procurement.

Use **AWS Kiro** quando:

- Você está disposto a comprometer com uma IDE específica.
- Hooks event-driven on-save integrados pela IDE são requeridos.

Use **OpenSpec** quando:

- Você quer o modelo mínimo de delta ADDED / MODIFIED / REMOVED
  sem os docs bilíngues, examples ou protocolo empírico que
  Doctrina coloca em cima.

Use **BMAD-METHOD** quando:

- Você explicitamente quer agentes paralelos por papel. Doctrina
  rejeita este pattern; se você acredita que a pesquisa está
  errada neste ponto, BMAD é honesto sobre a sua aposta.

Use **SpecWeave** quando:

- Você precisa de integração first-class ampla com agentes como
  critério de compra dominante.

## Fontes

Afirmações sobre outros frameworks vêm do documento de pesquisa
referenciado nos ADRs do próprio Doctrina e da documentação
pública de cada projeto. Doctrina não faz afirmações sobre
números internos de performance de competidores que não mediu.

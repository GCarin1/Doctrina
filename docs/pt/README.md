<p align="center">
  <img src="../assets/logo-monogram.svg" alt="Doctrina" width="96">
</p>

# Doctrina

> Framework spec-driven e AGENTS.md-native para desenvolvimento
> multi-agente com IA.

> Tradução da [versão em inglês](../en/README.md). O inglês é a
> fonte de verdade; este arquivo o segue.

O gargalo do desenvolvimento assistido por IA não é gerar código — é a
transferência confiável de intenção e a persistência de contexto entre
sessões e agentes. Doctrina trata **specs como fonte única de verdade**,
guarda decisões de arquitetura como **ADRs imutáveis** e orquestra o
trabalho por um **coordenador linear único** em vez de agentes paralelos
competindo. Tudo é Markdown e JSON em git: sem banco, sem vector store,
sem telemetria, zero dependências de runtime.

| | |
|---|---|
| **Funciona com** | Claude Code, OpenAI Codex CLI, Cursor, GitHub Copilot, Gemini CLI, Aider, Windsurf, Continue, Amp, Devin, Factory, Jules |
| **Requer** | Node.js ≥ 20.12, git |
| **Instalação** | `npm install -g doctrina-cli` ou `npx doctrina-cli` |
| **Licença** | MIT |

## Modo de uso em 5 minutos

Você descreve e aprova; o seu agente roda os comandos. Cada passo abaixo
diz o que ele roda, para você acompanhar ou conduzir à mão.

**1. Inicialize o repositório** — esqueletiza o `AGENTS.md` (o arquivo de
regras portável que todo agente lê) mais a árvore `.doctrina/`, e instala
adapters finos para todos os agentes suportados. Num terminal, o `init`
pede que você descreva o projeto uma vez e guarda a resposta:

```sh
cd meu-projeto
npx doctrina-cli init --agent all
npx doctrina-cli hooks install        # pre-commit: validate --fix, depois index rebuild --check --staged
```

**2. Passe para o seu agente** — diga *"leia o AGENTS.md e rode
`doctrina next`"*. Ele transforma a sua descrição no `product.md` e numa
spec EARS por capability (o playbook de bootstrap) e pede que você as
revise:

```sh
doctrina next      # um intake pendente aguarda conversão → doctrina intake
```

**3. Peça uma mudança em palavras simples** — todo pedido vira uma change:
um proposal (*por quê*), tasks e deltas de spec, com um playbook que o
agente segue. Ele carrega exatamente o contexto de que a tarefa precisa:

```sh
doctrina work "cobrar multa em faturas vencidas"
doctrina context billing --for "multa" --concat
```

**4. Feche** — uma passada atestada aplica os deltas (mecanicamente, pelos
blocos `ops`), roda as checagens do próprio projeto e arquiva a change.
Antes, o preview mostra tudo o que seria recusado:

```sh
doctrina change check 0001-late-fees --verbose   # o dry-run, todo delta à vista
doctrina close 0001-late-fees                    # a sequência de fechamento inteira, numa passada
```

**5. Registre decisões no caminho:**

```sh
doctrina decision new "Usar Postgres para o ledger"
doctrina decision accept 0001
```

Três meses depois, "por que Postgres?" é respondido por um arquivo, não
por arqueologia. Continue em **[Primeiros passos](getting-started.md)**
para o passo a passo completo, ou **[Workflow](workflow.md)** para o
ciclo propor → aplicar → arquivar em profundidade.

## A superfície de comandos

37 comandos, 59 operações, zero dependências — veja a
**[Referência do CLI](cli-reference.md)** para todos. Esses dois números
são verificados contra o catálogo do próprio CLI, então esta página não
consegue ficar para trás em silêncio. Os que você vai
usar todo dia:

| Comando | O que faz |
|---------|-----------|
| `doctrina prime` | O primer da sessão: gates, regras, trabalho aberto e próximos passos numa leitura |
| `doctrina next` | Diz a você (ou ao seu agente) a próxima ação recomendada |
| `doctrina work "<prompt>"` | Transforma um pedido numa change e imprime o playbook a seguir |
| `doctrina close <id>` | A definição de pronto: apply, verify, archive e validate numa passada |
| `doctrina context <cap>` | Imprime o pacote de contexto exato, em ordem de leitura |
| `doctrina validate` | Checagens de schema, estrutura, EARS e deriva do índice (cada uma listada na [referência do CLI](cli-reference.md)), pronto para CI |
| `doctrina search <termo>` | "Onde X foi decidido?" em todos os artefatos |

## Por que não só caprichar no prompt?

A Anthropic mediu que na avaliação BrowseComp **uso de tokens sozinho
explica 80% da variância em performance**
([fonte](https://www.anthropic.com/engineering/built-multi-agent-research-system)).
Doctrina investe onde os dados apontam: artefatos de contexto densos, bem
escopados e versionados — não mais agentes, papéis ou paralelismo. Leia
**[Engenharia de contexto](context-engineering.md)** para o argumento
completo e **[Comparação](comparison.md)** para o posicionamento honesto
frente a Spec Kit, OpenSpec, Kiro, BMAD e SpecWeave.

## Projeto

- **[Contribuição](contributing.md)** — dois workflows, Conventional
  Commits, como adicionar um adapter.
- **[Doações](donations.md)** — apoie o projeto.
- **[Changelog](https://github.com/GCarin1/Doctrina/blob/main/CHANGELOG.md)** ·
  **[Política de segurança](https://github.com/GCarin1/Doctrina/blob/main/SECURITY.md)** ·
  **[Licença MIT](https://github.com/GCarin1/Doctrina/blob/main/LICENSE)**

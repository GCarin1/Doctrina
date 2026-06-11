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

**1. Inicialize um projeto** — esqueletiza o `AGENTS.md` (o arquivo de
regras portável que todo agente lê) mais a árvore `.doctrina/`, e instala
adapters finos para todos os agentes suportados:

```sh
cd meu-projeto
npx doctrina-cli init --agent all
npx doctrina-cli hooks install        # pre-commit: validate em todo commit
```

**2. Descreva uma capability** — a spec é a verdade atual do que o
sistema faz, escrita em requirements EARS:

```sh
doctrina spec new billing
# edite .doctrina/specs/billing/spec.md — ou peça ao seu agente
```

**3. Abra uma change** — a unidade de trabalho. O proposal responde *por
quê*, as tasks listam o trabalho, os deltas descrevem updates de spec:

```sh
doctrina change new 0001-late-fees "Cobrar multa por atraso"
doctrina next                          # o CLI diz o próximo passo
```

**4. Deixe seu agente trabalhar** — agentes leem o `AGENTS.md`
automaticamente. Para entregar a um deles o contexto exato da tarefa:

```sh
doctrina context billing --concat | <seu agente>
```

**5. Aplique, verifique, arquive:**

```sh
doctrina change diff 0001-late-fees    # preview de todo delta
doctrina change apply 0001-late-fees   # ADDED/REMOVED auto, MODIFIED manual
doctrina validate                      # 18 checagens estruturais
doctrina change archive 0001-late-fees # história fora do caminho de leitura
```

**6. Registre decisões no caminho:**

```sh
doctrina decision new "Usar Postgres para o ledger"
doctrina decision accept 0001
```

Três meses depois, "por que Postgres?" é respondido por um arquivo, não
por arqueologia. Continue em **[Primeiros passos](getting-started.md)**
para o passo a passo completo, ou **[Workflow](workflow.md)** para o
ciclo propor → aplicar → arquivar em profundidade.

## A superfície de comandos

15 comandos, 26 operações, zero dependências — veja a
**[Referência do CLI](cli-reference.md)** para todos. Os que você vai
usar todo dia:

| Comando | O que faz |
|---------|-----------|
| `doctrina next` | Diz a você (ou ao seu agente) a próxima ação recomendada |
| `doctrina context <cap>` | Imprime o pacote de contexto exato, em ordem de leitura |
| `doctrina validate` | 18 checagens de schema/estrutura/EARS, pronto para CI |
| `doctrina search <termo>` | "Onde X foi decidido?" em todos os artefatos |
| `doctrina metrics --save` | Métricas de adoção via git local, zero rede |

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

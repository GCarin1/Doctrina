# Começando

> Tradução da [versão em inglês](../en/getting-started.md). O inglês é
> a fonte de verdade; este arquivo o segue.

Este guia te leva de um repositório vazio até um projeto Doctrina
funcionando em menos de cinco minutos.

## Pré-requisitos

- Node.js 20.12 ou superior (`node --version`).
- Um repositório git onde você quer instalar o Doctrina.

## Instalar

Doctrina é um CLI Node.js distribuído via npm.

```
# instalar globalmente
npm install -g doctrina-cli

# ou rodar sob demanda sem instalar
npx doctrina-cli init
```

O nome do pacote no npm é `doctrina-cli`; o executável que ele instala
é `doctrina`. Após o install global você invoca todo comando como
`doctrina <subcomando>`.

O pacote tem zero dependências de runtime, então a instalação é
rápida e a superfície de cadeia de suprimentos é vazia.

## Inicializar um projeto

Na raiz do seu repositório:

```
doctrina init --project-name "Acme" --agent claude
```

Isso cria:

- `AGENTS.md` na raiz do projeto — a fonte de verdade operacional
  portátil e legível por agentes.
- `.doctrina/product.md` — visão, escopo e usuários-alvo do seu
  projeto. Edite imediatamente.
- `.doctrina/index.json` — metadados de todos os artefatos.
- Diretórios vazios `.doctrina/specs/`, `.doctrina/changes/`,
  `.doctrina/changes/archive/` e `.doctrina/decisions/`.
- `CLAUDE.md` na raiz porque você passou `--agent claude`. O Codex
  CLI lê `AGENTS.md` nativamente, então `--agent codex` não instala
  nada. `--agent cursor` escreve `.cursor/rules/00-doctrina.mdc`.
  `--agent all` instala todos os adapters.

Valide o layout:

```
doctrina validate
```

Você deve ver `ok all validation checks passed`.

## Sua primeira spec de capability

Doctrina trata capabilities como unidade de verdade. Crie uma:

```
doctrina spec new billing
```

Isso esqueletiza `.doctrina/specs/billing/spec.md` com cabeçalhos
EARS prontos para preenchimento. Abra e escreva os requisitos que
descrevem como billing funciona **hoje** (não o que você gostaria
que fizesse — isso vai em changes).

## Seu primeiro change

Quando quiser adicionar, modificar ou remover uma capability, abra
um change:

```
doctrina change new 0001-add-stripe-webhook "Adicionar handler do webhook Stripe"
```

Isso cria `.doctrina/changes/0001-add-stripe-webhook/` com
`proposal.md`, `tasks.md` e `design.md`. Preencha. Depois adicione
o delta de spec:

```
mkdir -p .doctrina/changes/0001-add-stripe-webhook/specs/billing
# edite specs/billing/delta.md com Operation: MODIFIED e o corpo do delta
```

Implemente o trabalho no código. Quando terminar, aplique o change:

```
doctrina change apply 0001-add-stripe-webhook
```

Doctrina automatiza as operações comuns:

- **ADDED** materializa um novo arquivo de spec.
- **REMOVED** deleta a spec alvo.
- **MODIFIED** imprime um ponteiro de merge manual; não escreve.
  Você faz o merge à mão, o que mantém o agente fora de julgamentos
  sobre seções conflitantes.

Por fim, arquive o change:

```
doctrina change archive 0001-add-stripe-webhook
```

A pasta vai para
`.doctrina/changes/archive/2026-06-03-0001-add-stripe-webhook/` e
sai do caminho de leitura padrão do agente.

## Opcional: esqueletar uma skill

Quando um procedimento especializado se repete entre changes
(um padrão de migração, um checklist de review de segurança,
um fluxo de release), capture como skill on-demand:

```
doctrina skill new db-migration
```

Isso escreve `.doctrina/skills/db-migration.md` com o
frontmatter obrigatório `name`/`description`/`when`. Agentes
lêem o frontmatter barato e carregam o corpo completo só quando
o trigger dispara. Veja [skills.md](skills.md) para o contraste
de design com specs e com a pasta `memory/` rejeitada.

## Registrar uma decisão de arquitetura

Quando tomar uma decisão que leitores futuros vão precisar:

```
doctrina decision new "Adotar Postgres como store primário"
```

Edite o ADR resultante. Após aprovação, flip o `Status:` de
`proposed` para `accepted`. A partir desse momento, o ADR é
imutável. Para mudar uma decisão, supersede:

```
doctrina decision supersede 0001 "Mover para DynamoDB para escrita global"
```

O novo ADR é criado com `Supersedes: 0001`. O `Status:` do ADR
antigo é reescrito como `superseded by 0002`. O corpo do antigo
permanece intacto.

## Próximos passos

- Leia [workflow.md](workflow.md) para o ciclo completo.
- Leia [gating.md](gating.md) para saber quando o pipeline vale a
  pena.
- Leia [antipatterns.md](antipatterns.md) antes de bater neles na
  prática.
- Leia [cli-reference.md](cli-reference.md) para todas as flags.

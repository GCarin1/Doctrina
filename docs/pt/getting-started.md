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

## O caminho rápido: descreva uma vez, e siga

Você não precisa esqueletar cada spec à mão. Entregue ao Doctrina a
descrição completa do projeto e deixe seu agente de IA fazer a conversão
(ADR 0005):

```
doctrina init --intake descricao.md --agent claude
```

Isso guarda a descrição literal em `.doctrina/intake.md` e imprime um
**playbook de bootstrap** — os passos ordenados que o agente executa para
preencher o `product.md`, derivar a lista de capabilities e escrever uma
spec EARS por capability (avançando o `Implementation:` com honestidade,
mantendo aspiração sob `## Maturity`). O `AGENTS.md` esqueletado instrui
qualquer agente compatível com AGENTS.md a detectar o intake pendente e
rodar esse playbook sozinho — então, do seu lugar, é "descreva uma vez,
abra o agente e siga". (Já inicializou? Use `doctrina intake descricao.md`.)

Com o projeto criado, conduza cada feature com um prompt de uma linha:

```
doctrina work "adicionar login com email e senha"
```

O `work` esqueleta o change e imprime um **playbook de trabalho** —
contexto → delta de spec → tasks → implementar → analyze → apply →
**verify** → archive → validate — que o agente executa numa passada
linear. Os dois comandos são o caminho sem cerimônia; os comandos manuais
abaixo são exatamente o que eles orquestram, e seguem disponíveis quando
você quer controle fino.

## Sua primeira spec de capability

Doctrina trata capabilities como unidade de verdade. Crie uma:

```
doctrina spec new billing
```

Isso esqueletiza `.doctrina/specs/billing/spec.md` com cabeçalhos
EARS prontos para preenchimento. Abra e escreva os requisitos que
descrevem como billing funciona **hoje** (não o que você gostaria
que fizesse — isso vai em changes).

Uma spec tem dois eixos independentes: o `Status:` do documento
(`draft` → `active` → `deprecated`) e o estado de `Implementation:`
(`planned` → `partial` → `implemented` → `verified`). Um esqueleto novo
nasce um honesto `draft`/`planned`; avance cada eixo conforme o documento
e o código amadurecem. O `doctrina validate` avisa se você marcar uma spec
`active` enquanto ela continua `planned` sem nada construído por trás, e o
`doctrina coverage` reporta quais critérios de aceite citam um teste real.

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

Antes de arquivar, prove o trabalho. "Pronto" é uma afirmação até ser
verificada:

```
doctrina verify      # roda seu typecheck/test/build do .doctrina/verify.json
doctrina coverage    # cada critério de aceite deve citar um teste real
```

O `doctrina verify` é o gate de build real (declare seus comandos uma vez
com `doctrina verify --init`), distinto do `validate` estrutural. Depois
marque cada caixa no `tasks.md` do change (closing steps incluídos) e na
seção `## Verification` do proposal.

Por fim, arquive o change:

```
doctrina change archive 0001-add-stripe-webhook
```

O `doctrina change archive` **recusa** arquivar enquanto qualquer caixa de
task ou verificação estiver desmarcada — passe `--force` só para arquivar
deliberadamente com o gap registrado. Em sucesso, a pasta vai para
`.doctrina/changes/archive/2026-06-03-0001-add-stripe-webhook/` e sai do
caminho de leitura padrão do agente.

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

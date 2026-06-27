# Referência do CLI

> Tradução da [versão em inglês](../en/cli-reference.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Todos os comandos do CLI `doctrina`, com flags e códigos de saída.
Rode `doctrina <comando> --help` para a mesma informação no
terminal.

## Flags globais

| Flag | Efeito |
|------|--------|
| `--help`, `-h` | Imprime a ajuda no topo, ou ajuda por-comando se vier depois de um comando. |
| `--version`, `-v` | Imprime a versão do pacote. |

## Códigos de saída

| Código | Significado |
|--------|-------------|
| 0 | Sucesso (warnings permitidos). |
| 1 | Erro de comando: validação falhou, arquivo se recusou a sobrescrever, change não encontrado, etc. |
| 2 | Uso incorreto: comando desconhecido, argumento obrigatório ausente, entrada malformada. |

## `doctrina init`

Esqueletiza `AGENTS.md` e a árvore `.doctrina/` no diretório atual.

```
doctrina init [opções]
```

| Flag | Padrão | Função |
|------|--------|--------|
| `--project-name <nome>` | basename do cwd | Sobrescreve o nome do projeto nos artefatos. |
| `--project-description <texto>` | vazio (pergunta) | Descrição de uma frase. Omita `--non-interactive` para pular a pergunta. |
| `--agent <nome>` | nenhum | Instala o adapter para um dos doze agentes suportados (`claude`, `codex`, `cursor`, `copilot`, `gemini`, `aider`, `windsurf`, `continue`, `amp`, `devin`, `factory`, `jules`) ou `all`. Agentes AGENTS.md-native (`codex`, `amp`, `devin`, `factory`, `jules`) não instalam arquivo. |
| `--from <path>` | nenhum | Diretório local de conventions; faz fold do `AGENTS.md` e do `.doctrina/product.md` (quando presentes) no novo projeto antes do scaffold. Só caminhos de filesystem — sem URLs. |
| `--intake <file>` | nenhum | Descrição completa do projeto; armazenada literalmente em `.doctrina/intake.md`, usada para derivar a descrição de uma linha quando `--project-description` está ausente, e o playbook de bootstrap é impresso na hora — sem segundo comando. O `AGENTS.md` gerado também instrui qualquer agente a executar esse playbook sozinho ao ver um intake pendente. |
| `--date <YYYY-MM-DD>` | data do sistema | Sobrescreve a data nos artefatos. |
| `--force` | off | Sobrescreve arquivos existentes. |
| `--non-interactive` | off | Falha em vez de perguntar. |

`init` recusa se `AGENTS.md` ou `.doctrina/` já existem, a menos
que `--force` seja passado.

## `doctrina intake [<file>]`

Armazena a descrição completa do projeto literalmente em
`.doctrina/intake.md` e imprime o **playbook de bootstrap** — a
sequência ordenada de instruções que o agente de IA hospedeiro executa
para converter essa intenção no conteúdo de `product.md` e nas specs de
capabilities. O próprio CLI não faz nenhuma interpretação de linguagem
natural; a inteligência mora no agente executor (ver ADR 0005).

```
doctrina intake descricao.md
doctrina intake --text "Uma loja com login, catálogo e checkout"
doctrina intake                       # reimprime o playbook de um intake pendente
```

| Flag | Função |
|------|--------|
| `--text "<descrição>"` | Descrição inline em vez de um arquivo. |
| `--force` | Sobrescreve um `.doctrina/intake.md` existente. |

Os passos do playbook: ler o intake, preencher cada seção de
`product.md`, derivar a lista de capabilities e rodar `spec new` +
escrever EARS por capability, registrar quaisquer ADRs forçados, rodar
`clarify --all` e `validate`, e então virar o cabeçalho do intake para
`Status: converted`. Após a conversão as specs são a única fonte de
verdade — o intake nunca é editado para mudar requisitos. Sai com 1
quando nenhuma fonte é dada e nenhum intake existe.

## `doctrina work "<prompt>"`

Transforma um prompt curto em um change totalmente esqueletizado mais o
**playbook de trabalho** que o agente hospedeiro executa. O CLI deriva
um id de change sequencial (`NNNN-<slug>`), abre a pasta do change pelo
mesmo caminho de `change new`, registra o prompt literalmente sob o
`## Why` da proposal, ranqueia as specs existentes por sobreposição
determinística de termos como dica de capability, e imprime os passos
ordenados: context → spec delta → tasks → implementar → analyze →
apply → verify (`verify`/`coverage`) → archive → validate. Nenhuma
interpretação de linguagem natural acontece no CLI (ver ADR 0005).

```
doctrina work "adicione login com email e senha"
doctrina work "endurecer regras de senha" --capability auth
doctrina work "refazer billing" --id 0042-billing-overhaul
```

| Flag | Função |
|------|--------|
| `--capability <cap>` | Fixa a capability em vez de ranquear matches. |
| `--id <id>` | Sobrescreve o id de change derivado. |
| `--force` | Sobrescreve uma pasta de change existente. |

## `doctrina spec new <capability>`

Cria uma nova spec de capability a partir do template.

```
doctrina spec new billing
doctrina spec new checkout-flow --bug
```

Escreve `.doctrina/specs/<capability>/spec.md` e adiciona entrada
em `.doctrina/index.json`. Nomes de capability devem casar com
`[a-z][a-z0-9-]*`.

Uma spec de capability tem dois eixos independentes: o `Status:` do
documento (`draft` → `active` → `deprecated`) e o estado de
`Implementation:` (`planned` → `partial` → `implemented` → `verified`).
Um esqueleto novo nasce um honesto `draft`/`planned`; promova o `Status`
para active quando refletir a intenção, e avance o `Implementation`
conforme o código entra. O `validate` avisa quando uma spec `active`
continua `planned` sem nada construído por trás — uma afirmação de
inventário sem lastro.

O esqueleto também traz um header `**Realizes:**` (ADR 0011): nomeie os
anchors de critério de sucesso do `product.md` (`[SC1]`) que esta
capability entrega, ou registre `n/a — <porquê>` para uma capability
interna. A proveniência é opt-out — o `validate` avisa quando uma spec
`active` no eixo de implementação não declara header `Realizes:`, e o
`doctrina trace` reporta o elo intenção→capability.

| Flag | Função |
|------|--------|
| `--bug` | Esqueletiza o template no formato de bug (current/expected/unchanged behaviour) em vez da spec EARS de capability. |
| `--force` | Sobrescreve uma spec existente. |

## `doctrina spec list`

Uma linha por spec de capability: id, versão, status do documento,
estado de implementação, contagem de linhas e data de última
atualização, lidos dos headers da spec.

```
doctrina spec list
```

Read-only. Par do `skill list` e do `decision list`.

## `doctrina change new <id> "<title>"`

Abre uma proposta de change.

```
doctrina change new 0042-add-saml "Adicionar login SAML"
```

Escreve `.doctrina/changes/<id>/` com `proposal.md`, `tasks.md` e
`design.md`, além de um diretório `specs/` vazio para arquivos de
delta. Adiciona entrada em `.doctrina/index.json` sob `changes`.

O `<id>` é o nome do diretório. Convenção: `NNNN-slug`.

| Flag | Função |
|------|--------|
| `--force` | Sobrescreve uma pasta de change existente. |

## `doctrina change apply <id>`

Aplica cada delta encontrado em
`.doctrina/changes/<id>/specs/`.

```
doctrina change apply 0042-add-saml
```

Semântica:

- **ADDED:** escreve o corpo do delta na spec alvo. Recusa se a
  spec já existe.
- **REMOVED:** deleta a spec alvo.
- **MODIFIED:** imprime `manual[MODIFIED]` com um ponteiro; não
  escreve. Você faz o merge à mão.

Quando todos os deltas processam com sucesso (sem erros e sem
MODIFIED) e pelo menos um delta foi escrito, o `Status:` do
proposal flipa de `proposed` para `applied` e uma linha `Applied:`
é adicionada. Caso contrário, o proposal continua `proposed` até
você resolver os merges manuais e rodar de novo.

## `doctrina change archive <id>`

Move um change aplicado para
`.doctrina/changes/archive/YYYY-MM-DD-<id>/` e atualiza o index.

```
doctrina change archive 0042-add-saml
```

Arquivar é o ato de declarar um change terminado, então ele exige
verificação: o CLI **recusa** (exit 1) enquanto qualquer caixa no
`tasks.md` (incluindo os closing steps) ou na seção `## Verification`
do proposal estiver desmarcada. Termine e marque os itens, ou passe
`--force` para arquivar mesmo assim — o que imprime os itens pendentes
e registra o gap. É a diferença entre "caixas marcadas" e "verificação
passou".

| Flag | Função |
|------|--------|
| `--force` | Arquiva mesmo com a verificação incompleta (registra o gap). |

Arquivar também anexa um resumo de uma linha (data, id, título,
specs afetadas) em `.doctrina/changes/archive/LEDGER.md` — o jeito
barato de escanear a história sem abrir as pastas do archive, que
ficam fora do caminho de leitura default. O CLI só anexa; edite o
ledger à vontade.

## `doctrina change diff <id>`

Pré-visualiza cada spec delta de uma change antes de aplicar.

```
doctrina change diff 0042-add-saml
```

Por delta:

- **ADDED:** caminho do alvo e contagem de linhas do corpo
  (sinaliza conflito quando o alvo já existe).
- **REMOVED:** caminho do alvo e linhas que seriam deletadas.
- **MODIFIED:** diff de linhas unificado entre a spec alvo atual e
  o corpo do delta. O corpo do delta é um fragmento a mergear,
  então linhas `-` são conteúdo da spec ausente do delta —
  contexto, não necessariamente remoções.

Read-only; nunca modifica arquivos. Par do `analyze`: `analyze`
checa a forma da change, `diff` mostra o conteúdo.

## `doctrina decision new "<title>"`

Cria o próximo ADR sequencial a partir do template.

```
doctrina decision new "Adotar event sourcing no ledger"
```

Escreve `.doctrina/decisions/NNNN-<slug>.md` e adiciona entrada
no index. Novos ADRs começam com `Status: proposed`.

## `doctrina decision supersede <número> "<novo título>"`

Cria um novo ADR que substitui um existente, e reescreve somente
os headers `Status:` e `Superseded by:` do ADR antigo.

```
doctrina decision supersede 0007 "Adotar ledger baseado em CRDT"
```

O corpo do ADR antigo nunca é tocado. O novo ADR carrega
`Supersedes: 0007` no frontmatter.

## `doctrina decision accept <number>`

Vira um ADR `proposed` para `accepted`.

```
doctrina decision accept 0007
```

Reescreve só o header `Status:` — o corpo segue imutável — e
atualiza a entrada no index. Qualquer outro status atual (já
aceito, superseded, withdrawn) é erro claro sem escrita nenhuma.
Fecha o ciclo de vida que o `decision new` abre; o `doctrina next`
aponta para cá quando um ADR está parado em `proposed`.

## `doctrina decision list`

Uma linha por ADR: número, status, data e título, lidos dos
headers do ADR.

```
doctrina decision list
```

Read-only.

## `doctrina skill new <name>`

Esqueletiza uma nova skill (memória procedural on-demand) em
`.doctrina/skills/<name>.md` e indexa.

```
doctrina skill new db-migration
```

O slug deve casar com `[a-z][a-z0-9-]*`. O template carrega
frontmatter com `name`, `description` e `when`; preencha e
depois rode `doctrina skill sync` para espelhar a description
no index.

| Flag | Função |
|------|--------|
| `--force` | Sobrescreve uma skill existente. |

## `doctrina skill list`

Imprime uma linha por skill com slug e description do
frontmatter.

```
doctrina skill list
```

Read-only. Nunca modifica arquivos. Veja
[skills.md](skills.md) para o design rationale.

## `doctrina skill sync`

Copia a `description:` do frontmatter de cada skill para a
entrada correspondente do `.doctrina/index.json`.

```
doctrina skill sync
```

O frontmatter é a fonte única de verdade: edite o arquivo da
skill, rode `sync`, e o index acompanha. Skills presentes em
disco mas ausentes do index são indexadas; skills sem campo
`description:` são reportadas e puladas. Nunca edita arquivos
de skill. O `doctrina validate` avisa quando uma description
drifou do index.

## `doctrina analyze <change-id>`

Inspeciona uma pasta de change antes de aplicar.

```
doctrina analyze 0042-add-saml
```

Reporta por linha:

- Presença de `proposal.md` e presença de seção `## Why`.
- Presença de `tasks.md` e pelo menos uma task desmarcada.
- Presença de `design.md` (informacional, opcional).
- Para cada spec delta: validade do header `Operation:` e
  resolução do path da spec alvo.

Sai 0 sem falhas, 1 caso contrário. Não modifica arquivos.

## `doctrina clarify <path>`

Smell-test de ambiguidade num arquivo Markdown.

```
doctrina clarify .doctrina/specs/billing/spec.md
```

Sinaliza weasel words (`might`, `could`, `should probably`,
`perhaps`, `maybe`, `approximately`, `roughly`), quantificadores
vagos (`many`, `few`, `some`, `several` quando não seguidos de
número), placeholders (`TBD`, `TODO`, `FIXME`, `XXX`, `???`) e
seções `## Acceptance criteria` vazias.

`may` é deliberadamente não sinalizado: a gramática EARS Optional
usa "the system may ..." e um match sem filtro tornaria o comando
barulhento em toda spec Doctrina.

Pula blocos de código com fence, comentários HTML e backticks
inline. Sai 0 sem smells, 1 caso contrário — útil como gate
pré-PR em CI. Nunca modifica o arquivo.

Com `--all`, todo documento vivo é escaneado em um passe:
`product.md`, specs de capability, changes abertas e skills. ADRs
(imutáveis) e o archive (história) ficam de fora. Um comando, um
exit code — conecte ao CI ao lado do `validate`.

## `doctrina templates list`

Enumera os templates que o CLI Doctrina instalado ship.

```
doctrina templates list
```

Read-only. Imprime o caminho relativo de cada template no
diretório de templates do framework e a contagem de linhas. Útil
para descobrir o que `init`, `spec new`, `change new` e
`decision new` vão esqueletar.

## `doctrina templates check`

Compara o projeto atual contra a forma de template recomendada
shippada nesta versão do CLI.

```
doctrina templates check
```

Caminha por `AGENTS.md`, `.doctrina/product.md` e
`.doctrina/index.json` e reporta qualquer seção recomendada ou
campo de schema que esteja faltando. Read-only; nunca modifica
arquivos. Sai 0 quando toda seção recomendada está presente,
1 caso contrário.

Distinto de `validate`: `validate` responde "esta é uma árvore
Doctrina bem-formada?"; `templates check` responde "esta árvore
ainda segue a forma que os templates do CLI atual recomendam?"
Rode após `npm install -g doctrina-cli@latest` para ver se novas
formas de template adicionaram seções que seus arquivos
existentes ainda não adotaram.

## `doctrina templates update`

Corretor só-aditivo para o que o `templates check` reporta.

```
doctrina templates update [--write]
```

Preview é o default: o comando imprime o plano de update — seções
recomendadas faltando em `AGENTS.md` e `.doctrina/product.md`,
campos de schema ou categorias de artefato faltando no
`index.json` — não escreve nada e sai 1 enquanto há updates
pendentes. Com `--write` ele anexa seções stub (marcadas com
`<!-- added by doctrina templates update — fill in -->`) e
adiciona os campos faltantes. Conteúdo existente nunca é
reescrito ou removido; preencher os stubs continua sendo decisão
humana.

## `doctrina hooks install`

Instala o pre-commit hook do Doctrina em
`.git/hooks/pre-commit`.

```
doctrina hooks install [--force]
```

O hook roda `doctrina validate --fix`: ele regenera o `index.json`
a partir da árvore (curando a falha de gate mais comum — um header
editado à mão que dessincronizou o índice — e re-stageando o índice
reparado) e ainda bloqueia o commit em erros que um rebuild não cura.
O CLI recusa rodar fora de um repositório git e recusa sobrescrever
um hook existente sem `--force`. O hook instalado é um shell script
POSIX curto; edite à vontade depois da instalação (o CLI não
sobrescreve sem `--force`) — por exemplo, troque a linha por um
`doctrina validate` puro para gatekeep sem auto-reparo (estilo CI,
falha em qualquer drift).

No Windows o bit executável definido pelo instalador é no-op; o
hook roda sob Git Bash (o shell padrão que o git-for-Windows usa
para hooks), mas não sob `cmd.exe` puro. WSL e PowerShell com um
shell POSIX disponível também funcionam.

Para validação on-save (estilo Kiro Agent Hooks), veja
`.doctrina/templates/hooks/watch.sample`. É um wrapper shell
pequeno que pipea `doctrina validate` por um file watcher
instalado pelo usuário (`entr`, `fswatch`, etc.). O CLI não
instala nem roda; conecte à sua configuração de dev à mão.

## `doctrina validate`

Roda checagens de schema e estrutura contra `.doctrina/`.

```
doctrina validate
```

Checagens:

1. `AGENTS.md` existe e tem ≤ 200 linhas (warning a > 150).
2. `.doctrina/product.md` existe.
3. `.doctrina/index.json` parseia e segue o formato v0.1.
4. Todo artefato referenciado no index existe no caminho declarado.
5. Todo ADR tem header `Status:` parseável.
6. Todo template de adapter em `.doctrina/templates/adapters/`
   tem ≤ 30 linhas.
7. Todo change aberto tem `proposal.md`.
8. Toda spec de capability tem ≤ 400 linhas (warning a > 400).
9. Todo ADR tem ≤ 300 linhas (warning a > 300).
10. Toda spec e ADR presente em disco está referenciada no
    `index.json` (detecção de órfãos; warning se faltar).
11. Targets de link Markdown dentro de specs e ADRs que não
    existem em disco geram warning (detecção de referência
    stale). Paths em backticks são prosa descritiva e não são
    checados.
12. Cada skill carrega o trio de frontmatter obrigatório
    (`name`, `description`, `when`).
13. Cada skill tem ≤ 200 linhas (warning a > 150).
14. O `name:` de cada skill bate com o slug do filename.
15. O header `Version:` de cada spec de capability bate com a
    versão registrada no `index.json` (warning em caso de drift).
16. A description do frontmatter de cada skill bate com a
    registrada no `index.json` (warning; `doctrina skill sync`
    restaura).
17. Forma da gramática EARS por seção em toda spec que declara
    `## Requirements (EARS)`: requirements Ubiquitous carregam
    `shall` e nenhum prefixo When/While/Where, Event-driven
    começam com `When`, State-driven com `While`,
    Unwanted-behavior carregam `shall` mais uma negação, Optional
    começam com `Where` e usam `may` (só warnings; specs
    bug-shape são puladas).
18. Arquivos `AGENTS.md` aninhados abaixo da raiz obedecem aos
    mesmos caps de tamanho do arquivo raiz (warning > 150 linhas,
    erro > 200); diretórios de dependência, build e VCS são
    pulados.
19. Honestidade de dois eixos: uma spec de capability `Status: active`
    com `Implementation: planned` e sem nota gera warning (uma spec
    ativa sem nada construído por trás).
20. Evidência de ADR: um ADR aceito que adota o header `Evidence:` mas
    cita um path ausente em disco gera warning (drift de decisão), e um
    ADR aceito cuja evidência é o placeholder vazio gera warning (cite,
    ou anote `n/a — <motivo>`).
21. Ledger ↔ index do archive: quando `changes/archive/LEDGER.md`
    existe, todo change arquivado precisa aparecer nele e em
    `index.json.changes_archive`, ou a validação **falha** (erro).
22. Contratos presentes em disco mas ausentes do `index.json` geram
    warning (detecção de órfãos), e todo path de contrato indexado
    precisa existir.
23. Adoção de proveniência: uma spec de capability `Status: active` no
    eixo de implementação mas sem header `Realizes:` gera warning — não
    traça a nenhuma intenção de produto (ADR 0011). Qualquer valor
    silencia, inclusive um deliberado `n/a — <motivo>`.

A flag `--fix` regenera o `index.json` a partir da árvore antes de
checar, então um índice em drift é reparado (e o carimbo
`framework_version` migrado) em vez de reportado — o pre-commit
instalado roda isso.

Sai 0 sem erros, 1 caso contrário. Warnings não falham a
validação.

## `doctrina coverage`

Reporta quantos critérios de aceite em `.doctrina/specs/` citam um
artefato ou teste que existe em disco — a rastreabilidade que o
`validate` não checa.

```
doctrina coverage
doctrina coverage --strict
```

Cada critério numerado pode citar sua evidência como um path em
backticks, ex.: `1. Retorna 429 acima da cota — verified by \`test/quota.test.ts\`.`
Um critério está **covered** quando ao menos um path citado resolve,
**dangling** quando um path citado está ausente, e **bare** quando nada
é citado. Read-only.

| Flag | Função |
|------|--------|
| `--strict` | Sai 1 quando algum critério é bare ou dangling (gate de CI). Sem ela, o comando sempre sai 0 (um relatório). |

## `doctrina verify`

Roda as checagens de build/verify declaradas pelo projeto — o gate real
de "o código funciona", distinto do `validate` estrutural e nunca
executado pelo hook de pre-commit.

```
doctrina verify
doctrina verify --init
doctrina verify --list
```

As checagens vivem em `.doctrina/verify.json`:

```
{
  "checks": [
    { "name": "typecheck", "run": "tsc --noEmit" },
    { "name": "test",      "run": "npm test" },
    { "name": "build",     "run": "npm run build" }
  ]
}
```

Cada `run` executa em ordem pelo shell com a saída transmitida; o
`verify` sai não-zero se qualquer checagem falhar. Sem config, sai 1 e
aponta para `--init`. Um campo opcional `cwd` por checagem (relativo à
raiz do projeto) mira um sub-pacote num monorepo.

| Flag | Função |
|------|--------|
| `--init` | Esqueletiza um `.doctrina/verify.json` inicial (recusa sobrescrever sem `--force`). |
| `--list` | Imprime as checagens configuradas sem executá-las. |
| `--force` | Com `--init`, sobrescreve uma config existente. |

## `doctrina contract new <name>` / `list` / `check`

É dono da superfície de integração/runtime que spec de capability
nenhuma possui: o mapa de portas, o contrato de ambiente e as
interfaces API/WS/eventos.

```
doctrina contract new system
doctrina contract check
```

`contract new` esqueletiza `.doctrina/contracts/<name>.md` (tabelas de
Ports, Environment, Interfaces, References) e o indexa. `contract check`
verifica a parte mecanicamente checável:

- **Colisão de portas** — dois serviços reivindicando a mesma porta é
  erro.
- **Drift de ambiente** — uma variável declarada no contrato mas ausente
  do `.env.example` é warning.
- **Specs referenciados** — todo `specs/<capability>` referenciado
  precisa existir (erro caso contrário).

Sai 1 em erros (colisão de portas, specs ausentes), 0 caso contrário.

## `doctrina index rebuild`

Regenera `.doctrina/index.json` a partir dos artefatos em disco.

```
doctrina index rebuild [--check]
```

Os arquivos são a fonte de verdade; o index é artefato derivado.
O rebuild lê os headers das specs (`Status:`, `Version:`,
`Last updated:`), os headers dos ADRs, os proposals das changes,
os nomes das pastas do archive e o frontmatter das skills. Campos
sem fonte em disco — nome do projeto, `framework_version`,
metadata do product — são preservados do index existente.

Com `--check` o comando não escreve nada, imprime um resumo do
drift por categoria de artefato e sai 1 quando o index não bate
mais com a árvore. Conecte ao CI ao lado do `validate`.

## `doctrina next`

Imprime as próximas ações recomendadas do workflow, em ordem de
prioridade.

```
doctrina next
```

Inspeciona a árvore e reporta: changes abertas (proposal faltando,
tasks desmarcadas, deltas prontos para aplicar,
aplicadas-mas-não-arquivadas), ADRs ainda em status `proposed`, ADRs
aceitos sem nada que os comprove ainda (sugerindo `decision land`), um
nudge único de captura de skill quando nenhuma existe e uma change
arquivada tem cara de fix, e o drift do index por último (ADR 0011).
Quando nada está aberto, diz isso e aponta para `change new` /
`spec new`.

Read-only; sempre sai 0. Pensado para agentes e humanos retomarem
o trabalho sem reler a árvore inteira.

## `doctrina metrics`

Deriva métricas de adoção do **histórico git local**. Zero
chamadas de rede; nada sai do repositório.

```
doctrina metrics [--since <dias|data>] [--save]
```

| Flag | Default | Função |
|------|---------|--------|
| `--since <n\|data>` | `90` | Janela: contagem de dias ou qualquer data que o git parseie (`2026-01-01`, `"3 months ago"`). |
| `--save` | off | Escreve `.doctrina/metrics/YYYY-MM-DD.json` e imprime os deltas contra o snapshot anterior mais recente. |

Reporta contagem de commits, reverts e taxa, share de `fix`
(Conventional Commits), arquivos com maior churn e a taxa de
re-edição em 21 dias — a fração de commits que tocam um arquivo
editado nos 21 dias anteriores. A taxa de re-edição é um *proxy*
de retrabalho: trabalho iterativo também conta, então compare
tendências entre snapshots, não valores absolutos.

É a metade de tooling do protocolo A/B empírico em
[validation.md](validation.md): snapshot antes de adotar o
Doctrina, snapshot mensal depois, compare.

## `doctrina context [<capability>]`

Imprime o pacote de contexto exato para uma tarefa, na ordem de
leitura documentada.

```
doctrina context billing
doctrina context billing --concat
```

O pacote é: `AGENTS.md` → `.doctrina/product.md` → a spec da
capability (quando dada) → changes abertas → ADRs com status
`accepted` — cada um com sua contagem de linhas, mais o total.
Skills são listadas à parte como nome + description apenas: são
on-demand por design, o corpo carrega só quando a tarefa casa. O
archive de changes e ADRs não-aceitos ficam de fora.

Com `--concat` o comando imprime o conteúdo dos arquivos com
separadores de caminho em vez da lista — pronto para entregar a um
agente. É a seção de ordem de leitura do AGENTS.md virada em
tooling: seleção em vez de despejo. Read-only; sempre sai 0.

## `doctrina search <termo> [...]`

Busca case-insensitive na árvore de artefatos, agrupada por
categoria.

```
doctrina search saml login
doctrina search quota --archive
```

Todo termo deve casar na mesma linha (AND). Categorias: specs,
decisions, changes, skills, product, AGENTS.md. O archive de
changes fica de fora a menos que `--archive` seja passado. Sai 0
quando há matches, 1 caso contrário. Read-only — responde "onde X
foi decidido?" sem conhecer o layout da árvore.

## Variáveis de ambiente

| Variável | Efeito |
|----------|--------|
| `NO_COLOR` | Desabilita ANSI no output (per https://no-color.org). |
| `FORCE_COLOR=0` | Mesmo que `NO_COLOR`. |
| `FORCE_COLOR` (qualquer outro valor) | Força cor mesmo quando stdout não é TTY. |

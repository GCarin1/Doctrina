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

Num terminal interativo, o `init` também oferece a instalação de
adapter como passo de wizard quando `--agent` não foi passado
(responda `none` para pular); em pipes, CI ou sob `--non-interactive`
o prompt nunca dispara.

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

O slug é truncado em fronteira de palavra (nunca no meio de um token), e
o playbook fecha com `doctrina close <id>` (o fechamento atestado em uma
passada) depois de um checkpoint explícito de ADR — "esta change decide
algo estrutural? registre antes de fechar."

Com `--capability`, o change também ganha um **delta esqueletizado** em
`specs/<cap>/delta.md` com o header `**Operation:**` pré-preenchido
(`MODIFIED` quando a spec existe, `ADDED` quando não) — o delta era
historicamente o único arquivo 100% escrito à mão do fluxo, e um header
ausente só explodia dias depois no `analyze` do fechamento. Nunca
esqueletizado a partir de um palpite do ranking; só do pin explícito.

| Flag | Função |
|------|--------|
| `--title "<curto>"` | Título curto de exibição: dirige o slug e o H1 da proposal; o prompt completo continua indo para o `## Why`. Sem ela, um prompt longo vira um H1 longo. |
| `--capability <cap>` | Fixa a capability em vez de ranquear matches, e esqueletiza um `delta.md` pré-preenchido para ela. |
| `--quiet` | Registra o change e imprime uma linha — sem playbook. Para registrar backlog ("anotar 19 works agora, começar nenhum"); reimprima depois com `--resume <id>`. |
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

## `doctrina spec set <capability>`

Edita os headers de uma spec — e opcionalmente a marca de um
critério de aceitação — e ressincroniza o index no mesmo passo,
para que a spec e o `index.json` nunca divirjam (ADR 0007/0009).
Todas as operações pedidas aplicam atomicamente: qualquer erro
deixa a spec intocada.

```
doctrina spec set billing --implementation partial
doctrina spec set billing --bump minor --criterion "2:verified"
```

| Flag | Propósito |
|------|-----------|
| `--implementation "<estado>"` | Define o header `Implementation:` (`planned` → `partial` → `implemented` → `verified`). |
| `--status "<estado>"` | Define o header `Status:` do documento (`draft` / `active` / `deprecated`). |
| `--bump major\|minor\|patch` | Incrementa o `Version:` da spec. |
| `--version X.Y.Z` | Define o `Version:` da spec explicitamente. |
| `--criterion "<n>:<marca>"` | Define a `[marca]` do critério *n*, ex.: `"2:verified"`. |

Carimba `Last updated:` e regenera `.doctrina/index.json` a partir
da árvore, ecoando a versão resultante da **spec** (não a do CLI — as
duas eram idênticas na saída, e a ambiguidade foi um papercut da review
de campo). Sem nenhuma flag de edição, sai com código 2.

## `doctrina change new <id> "<title>"`

Abre uma proposta de change.

```
doctrina change new 0042-add-saml "Adicionar login SAML"
```

Escreve `.doctrina/changes/<id>/` com `proposal.md` e `tasks.md`, além
de um diretório `specs/` vazio para arquivos de delta (`design.md` só é
esqueletizado sob `--design` — na prática ele ficava em branco em toda
change que não pediu um). Adiciona entrada em `.doctrina/index.json`
sob `changes`.

O `<id>` é o nome do diretório. Convenção: `NNNN-slug`.

| Flag | Função |
|------|--------|
| `--chore`, `--no-spec` | Abre uma change chore sem spec (infra/docs/build) que ainda ganha proposal + ledger. |
| `--design` | Também esqueletiza `design.md` (opt-in). |
| `--force` | Sobrescreve uma pasta de change existente. |

## `doctrina change apply <id...>`

Aplica cada delta encontrado em
`.doctrina/changes/<id>/specs/`. Vários ids rodam em sequência, cada um
independente (fechamento em lote de backlog); o código de saída é o pior
resultado por id.

```
doctrina change apply 0042-add-saml
doctrina change apply 0042-add-saml 0043-rate-limit 0044-audit-log
```

Semântica:

- **ADDED:** escreve o corpo completo do delta na spec alvo. Um alvo que
  ainda é o **esqueleto intocado do `spec new` é substituído** — esse é o
  fluxo canônico de capability nova (`spec new` → escrever o delta ADDED
  → apply). Só um alvo com conteúdo real recusa (use MODIFIED, ou
  remova-o antes).
- **REMOVED:** deleta a spec alvo.
- **MODIFIED com bloco ` ```ops `:** aplicado mecanicamente — todas as
  ops ou nenhuma (ADR 0007). Os verbos cobrem headers (`set-header` /
  `bump-version`), critérios de aceitação (`set-criterion` /
  `replace-criterion` / `append-criterion`) e os bullets EARS de
  requisito (`append-requirement <seção>: <texto>` /
  `replace-requirement <seção> <n>: <texto>`, seções
  `ubiquitous|event|state|unwanted|optional`), então um delta típico
  aplica de ponta a ponta sem merge manual. Ops `append-*` resolvem
  numeração/posição na hora do apply, então changes abertas
  concorrentes anexando à mesma spec nunca colidem. A sintaxe vive no
  template do delta e no playbook do work.
- **MODIFIED sem bloco:** imprime `manual[MODIFIED]` com um ponteiro;
  você faz o merge da prosa à mão (reescrever prosa livre — Purpose,
  Maturity — é o único caso que resta).

Quando todos os deltas processam com sucesso (sem erros e sem merges
manuais) e pelo menos um delta foi escrito, o `Status:` do proposal
flipa de `proposed` para `applied` e uma linha `Applied:` é adicionada.
Uma change cujos merges ficaram manuais ganha o carimbo na hora do
`change archive`, então o arquivo nunca contradiz o ledger.

## `doctrina change archive <id...>`

Move um change aplicado para
`.doctrina/changes/archive/YYYY-MM-DD-<id>/` e atualiza o index.
Vários ids rodam em sequência; o código de saída é o pior por id.

```
doctrina change archive 0042-add-saml
doctrina change archive 0042-add-saml 0043-rate-limit
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

## `doctrina change check <id...>`

Dry-run pré-fechamento — tudo que o `close` recusaria, listado **antes**
de qualquer coisa rodar, com a remediação ao lado de cada achado.
Read-only; o `doctor` por-change.

```
doctrina change check 0042-add-saml
```

Três passes mais um advisory:

1. **estrutura** — os mesmos checks que o `analyze` roda (proposal,
   tasks, headers de delta, alvos).
2. **dry-run das ops** — o bloco ` ```ops ` de cada delta MODIFIED
   executado em memória contra a spec alvo: uma op que falharia na hora
   do apply (header ausente, critério ou requisito inexistente, verbo
   desconhecido) é reportada aqui, não no fechamento. Um delta sem bloco
   ops é sinalizado como merge manual, para o fechamento ser planejado
   em volta dele.
3. **gate do archive** — as caixas desmarcadas que o `archive` vai
   recusar, com o conserto em lote (`change tick <id> --all`) nomeado.

Advisory (nunca bloqueia): os ADRs aceitos cujo texto cita as
capabilities tocadas — se a change altera o que um ADR decidiu, registre
o amendment (`decision supersede` / `decision new`) em vez de passar por
cima em silêncio.

Sai com 0 e `ready to close` quando as três áreas estão limpas. Aceita
vários ids.

## `doctrina change tick <id> [n... | --all]`

Lista — e marca em lote — as caixas desmarcadas de uma change: cada
`- [ ]` do `tasks.md` mais a seção `## Verification` do proposal, em um
espaço contínuo de ordinais.

```
doctrina change tick 0042-add-saml            # lista com ordinais
doctrina change tick 0042-add-saml 1 3        # marca as caixas 1 e 3
doctrina change tick 0042-add-saml --all      # marca tudo
```

Marcar checkbox era o único passo sem comando nenhum — fechamento em
lote significava sed/Python à mão. Marcar é uma *alegação* de conclusão;
os gates honestos continuam sendo `verify`/`coverage`/`archive` — isto
só remove a fricção mecânica.

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

## `doctrina change abandon <id>`

Descarta uma change aberta de forma limpa — o inverso do
`change new`.

```
doctrina change abandon 0042-add-saml --reason "substituída pela 0043"
```

Deleta a pasta da change aberta e sua entrada no `index.json`,
anexa um registro de abandono de uma linha ao
`.doctrina/changes/archive/LEDGER.md` (a história preserva o rastro
mesmo do trabalho que não foi adiante) e reconstrói o index a
partir da árvore.

| Flag | Propósito |
|------|-----------|
| `--reason "<texto>"` | Registra na linha do ledger por que a change foi abandonada. |

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

## `doctrina decision land <number> [path ...]`

Registra que um ADR aceito agora está implementado, sem mutar a
decisão.

```
doctrina decision land 0007 src/ledger.js test/ledger.test.js
```

Carimba somente o header `Landed:` com a data de hoje mais os
caminhos de prova citados; o corpo da decisão segue imutável.
Isso satisfaz o check de evidência de ADR aceito no `validate`
(e o lembrete do `doctrina next`) sem precisar substituir o ADR.
Recusa aterrissar um ADR que não esteja `accepted`.

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

## `doctrina skill suggest`

Mostra lições com cara de fix cuja skill ainda não foi capturada — o caso de
manual de uma skill (ADR 0012). Varre duas fontes determinísticas: propostas
de change arquivadas e commits fix-shaped no histórico git (ADR 0013). Skills
são escritas por humanos; isto só aponta.

```
doctrina skill suggest
doctrina skill suggest --write
doctrina skill suggest --since v0.7.0
```

Lista slugs candidatos — derivados dos ids de change fix-shaped arquivados,
ou dos subjects de commit fix-shaped (`fix:`, `fix(scope):`, `bug:`, …; nunca
`feat:`/`refactor:`) — cada um com sua lição (o `## Why` da change, ou o
subject do commit) e sua origem (`from <archive>` ou `from commit <sha>`).
Candidatos são deduplicados contra skills existentes — por slug exato, por
uma skill existente cujo corpo cita o change-id/commit do candidato, e por
similaridade de tokens entre slugs (uma lição capturada sob *outro* nome não
ressurge como candidato "novo"). O archive vence a colisão. Com `--write`,
esqueletiza um stub por candidato, pré-preenchido a partir da fonte, e o
indexa — para que escrever a skill seja "preencher", não "começar do zero".
`--since <ref>` varre commits em `<ref>..HEAD` em vez dos últimos 200; a
fonte git degrada silenciosamente para apenas-archive quando não há repo.
Read-only sem `--write`.

## `doctrina intent add "<texto>"` / `list`

Evolução de intenção pós-intake. Capabilities nascidas depois do intake —
brainstorms, pivôs — terminavam inevitavelmente em `Realizes: n/a`, deixando
o `trace` cego para a parte mais nova do sistema.

```
doctrina intent add "Risk map responde 'o que testar agora?' em uma leitura"
doctrina intent add "SC15: <texto>"    # fixa um id explícito
doctrina intent list
```

`add` anexa um novo bullet de âncora (`- [SC5] <texto>`) aos Success
criteria do product.md, alocando o próximo número do prefixo dominante (ou
fixe um com a forma `SC15:`). O follow-up é impresso: declare
`**Realizes:** SC5` na spec que a entrega, e o `doctrina trace` fecha o
loop. `list` imprime cada âncora em ordem de documento. O CLI aloca e
anexa; o texto da intenção é o seu, verbatim (ADR 0005).

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

**Sensível ao idioma.** `--lang pt|en` força o léxico; senão decide o
idioma declarado em `.doctrina/config.json`
(`{ "language": "pt-BR" }`), senão uma contagem de stopwords por
arquivo. O modo português troca o léxico: `talvez`, `provavelmente`,
`vários`, `alguns`, … são os smells, e os falsos positivos do inglês
desaparecem (`some` é o verbo *sumir*; `TODO` sem dois-pontos é o
pronome *todo* — só `TODO:` é marcador). A flag importa em arquivos de
idioma misto, onde a heurística pode pender para o lado errado. Uma
linha com `<!-- clarify:ok -->` é aceita pelo autor e nunca é
sinalizada — o escape para um falso positivo que o léxico não tem como
conhecer.

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
campo de schema que esteja faltando — inclusive se o **bloco
doctrina:surface** do AGENTS.md (o catálogo de comandos delimitado por
marcadores, propriedade do CLI, gerado do CLI instalado; ADR 0015)
está presente e atual. Read-only; nunca modifica arquivos. Sai 0
quando toda seção recomendada está presente, 1 caso contrário.

Distinto de `validate`: `validate` responde "esta é uma árvore
Doctrina bem-formada?"; `templates check` responde "esta árvore
ainda segue a forma que os templates do CLI atual recomendam?"
Rode após `npm install -g doctrina-cli@latest` para ver se novas
formas de template adicionaram seções que seus arquivos
existentes ainda não adotaram.

## `doctrina templates update`

Corretor para o que o `templates check` reporta.

```
doctrina templates update [--write]
```

Preview é o default: o comando imprime o plano de update — seções
recomendadas faltando em `AGENTS.md` e `.doctrina/product.md`,
campos de schema ou categorias de artefato faltando no
`index.json`, e o estado do **bloco doctrina:surface** do AGENTS.md —
não escreve nada e sai 1 enquanto há updates pendentes. Com `--write`
ele anexa seções stub (marcadas com
`<!-- added by doctrina templates update — fill in -->`), adiciona os
campos faltantes e **regenera o bloco surface** a partir do catálogo
do CLI instalado: um bloco desatualizado é reescrito no lugar; uma
seção legada `## Doctrina command surface` escrita à mão (esqueleto de
CLI antigo, sem marcadores) é substituída pelo bloco gerenciado; um
arquivo sem nenhum dos dois ganha o bloco anexado. O trecho entre
marcadores é a única região de propriedade do CLI (ADR 0015) — tudo
fora dele nunca é reescrito ou removido, e preencher os stubs continua
sendo decisão humana.

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
24. Drift da superfície de comandos do AGENTS.md: uma referência
    `doctrina <cmd>` a um comando que a CLI não tem gera warning
    (typo/removido), e — para um AGENTS.md que documenta um catálogo de
    comandos e não defere a `doctrina --help` — comandos que a CLI tem e
    o hub omite geram warning (o hub que o agente lê primeiro fica em
    sincronia com a superfície real).
25. Critério de aceite auto-certificado: um critério marcado `[verified]`
    que não cita nenhum path de prova gera warning (honest gates, ADR
    0008; evidência em linha de continuação conta, então não há
    falso-positivo).
26. Paridade de docs bilíngues: num projeto com `docs/en/` e `docs/pt/`,
    um arquivo Markdown presente em uma árvore de idioma e ausente na
    outra gera warning, nas duas direções (projetos sem as duas árvores
    nunca veem este check).
27. Regras do projeto (`.doctrina/rules.json`): restrições permanentes e
    lintáveis — cada regra é um regex proibido sobre paths com glob, e um
    match é um **erro** com a mensagem da própria regra. O lugar de
    instruções como "white-label: nunca citar a empresa X", que antes
    viviam só na memória do agente e expiravam com a sessão:

    ```
    { "rules": [ { "id": "white-label", "forbid": "\\bAcmeCorp\\b",
                   "paths": ["src/**", ".doctrina/specs/**"],
                   "message": "produto white-label; use placeholder genérico" } ] }
    ```

A flag `--fix` regenera o `index.json` a partir da árvore antes de
checar, então um índice em drift é reparado (e o carimbo
`framework_version` migrado) em vez de reportado — o pre-commit
instalado roda isso. `--json` emite `{ ok, errors, warnings }` para
agentes e pipelines de CI.

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
é citado. Uma spec que declara adiamento deliberado — `Implementation:
planned — <porquê>`, o mesmo escape que o `validate` respeita — tem seus
critérios não-provados reportados como **deferred**: visíveis, nunca uma
falha de `--strict` (dívida declarada não é dívida escondida). Read-only
sem `--run`.

| Flag | Função |
|------|--------|
| `--strict` | Sai 1 quando algum critério é bare, dangling ou conditional (gate de CI). Deferred nunca falha. Sem ela, o comando sempre sai 0 (um relatório). |
| `--only <cap,cap>` | Escopa o relatório/gate a capabilities específicas (o `doctrina close` usa isto para uma spec adiada alheia não bloquear o close de uma change). |
| `--run` | Executa a evidência citada via o `"evidence_runner"` declarado pelo projeto em `.doctrina/verify.json` (um template de comando com placeholder `{file}`, ex.: `"python -m pytest {file}"`). Sai 1 quando alguma execução falha — promove "o arquivo existe" para "a prova passa". |
| `--json` | Emite as linhas de critério por spec + resumo como JSON. |

## `doctrina trace`

Relata a proveniência de intenção: quais âncoras de critério de
sucesso do `product.md` (`- [SC1] ...`) são realizadas por quais
specs de capability (ADR 0006).

```
doctrina trace
doctrina trace --strict
```

Mapeia cada âncora para as specs cujo header `**Realizes:**` a
nomeia, e relata as três quebras de proveniência: **dropped intent**
(âncora que nenhuma spec realiza), **dangling realizes** (spec
citando âncora que não existe) e specs ativas **untraceable** (sem
header `Realizes:` — um `n/a — <porquê>` deliberado é aceito).
Read-only.

| Flag | Função |
|------|--------|
| `--strict` | Sai 1 quando existe alguma quebra de proveniência (gate de CI). Sem ela, o comando sempre sai 0 (um relatório). |
| `--json` | Emite anchors/dangling/untraceable + resumo como JSON. |

## `doctrina review`

Review de conformidade determinístico das suas mudanças contra a árvore de
specs / ADRs / contratos (ADR 0012). Revisa o working tree por padrão, ou um
diff contra um ref git com `--diff <ref>`.

```
doctrina review
doctrina review --diff main
doctrina review --strict
```

Reporta quebras estruturais: código mudado sob uma capability cuja spec não
foi atualizada, código mudado que não mapeia para nenhuma capability,
critérios de aceite citando prova ausente, intenção de produto realizada por
nenhuma spec, e colisões de contrato. Checa a *forma* da conformidade — se o
código é fiel à spec continua sendo julgamento humano/LLM (o teto do ADR
0005). Read-only; sai 0 como relatório, 1 sob `--strict` quando há quebra
dura. O agente se autorevisa aqui antes de levar o trabalho ao humano.

## `doctrina verify`

Roda as checagens de build/verify declaradas pelo projeto — o gate real
de "o código funciona", distinto do `validate` estrutural e nunca
executado pelo hook de pre-commit.

```
doctrina verify
doctrina verify --init
doctrina verify --list
doctrina verify --signoff "chronicle=lê bem, aprovado"
```

As checagens vivem em `.doctrina/verify.json`. Uma checagem com
`"type": "manual"` é o gate qualitativo (ADR 0012): julgada por
humano/eval e registrada como sign-off, não rodada como comando.

```
{
  "checks": [
    { "name": "typecheck", "run": "tsc --noEmit" },
    { "name": "test",      "run": "npm test" },
    { "name": "build",     "run": "npm run build" },
    { "name": "chronicle", "type": "manual", "rubric": "a crônica é gostosa de ler?" }
  ]
}
```

Cada `run` executa em ordem pelo shell com a saída transmitida; o
`verify` sai não-zero se qualquer checagem de comando falhar. Sem config,
sai 1 e aponta para `--init`. Um campo opcional `cwd` por checagem (relativo
à raiz do projeto) mira um sub-pacote num monorepo. Uma checagem manual passa
quando assinada e é reportada como *pendente* caso contrário — não-bloqueante
por padrão, falhando só sob `--strict`. Sign-offs ficam em
`.doctrina/verify.signoffs.json`.

| Flag | Função |
|------|--------|
| `--init` | Esqueletiza um `.doctrina/verify.json` inicial (recusa sobrescrever sem `--force`). |
| `--list` | Imprime as checagens configuradas sem executá-las. |
| `--clean` | Linta package.json por footguns de reprodutibilidade em vez de rodar as checagens. |
| `--strict` | Falha o gate quando uma checagem manual está pendente de sign-off. |
| `--signoff "<nome>=<nota>"` | Registra o sign-off de hoje para uma checagem manual e sai. |
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
o trabalho sem reler a árvore inteira. `--json` emite `{ actions }`
para pipelines.

## `doctrina status`

Painel de saúde do projeto em um olhar (ADR 0012).

```
doctrina status
```

Imprime os sinais de gate (drift do index, carimbo do framework, % de
coverage, anchors de trace, se o verify está configurado) e as contagens de
artefatos (specs por estado de implementação, changes abertas, decisões,
skills). Read-only; sempre sai 0. É um resumo rápido, não o gate
autoritativo — `doctrina validate` / `verify` são. Comando natural de início
de sessão para o agente (`doctrina prime` é o primer de sessão mais rico).

| Flag | Função |
|------|--------|
| `--json` | Emite o snapshot como JSON (forma estável para agentes e CI). |

## `doctrina close <id...>`

Roda toda a sequência de fechamento de uma change em uma passada (ADR 0012).

```
doctrina close 0001-add-login
doctrina close 0001-add-login --force
doctrina close 0001-add-login 0002-rate-limit 0003-audit
```

Dirige analyze → **checkpoint de ADR** (advisory: os ADRs aceitos cujo
texto cita as capabilities tocadas, com os comandos de amendment — o
passo "registre um ADR" do playbook era ignorável em silêncio) →
`change apply` → verify → `coverage --strict` → trace →
`change archive` → validate → **skill suggest** (advisory: lições
fix-shaped ainda não capturadas, sugeridas enquanto estão frescas),
parando na primeira falha com o comando exato para reexecutar. O gate de
coverage é **escopado às capabilities que os deltas da change tocam**
(`--only` por baixo), então uma spec deliberadamente adiada em outro
canto da árvore não bloqueia um close que nunca a tocou; uma change sem
deltas gateia na árvore inteira. O verify é pulado (com aviso) quando
não há `verify.json`; o trace e os dois advisories nunca bloqueiam. É um
driver sobre os comandos existentes — não adiciona checagens próprias —
então o agente faz uma chamada em vez de nove.

Vários ids fecham em sequência, cada um independente; o código de saída
é o pior resultado por id. Pré-visualize o que o close recusaria com
`doctrina change check <id>`.

| Flag | Função |
|------|--------|
| `--force` | Repassa ao `change archive` (arquiva mesmo com verificação incompleta; registra o gap). |

## `doctrina why <capability>`

Explica a proveniência nas duas direções (ADR 0012).

```
doctrina why event-sourcing
doctrina why SC1
```

Direto (nome de capability): monta, em uma leitura, a intenção de produto
que ela `Realizes:` (os anchors `[SC1]` com o texto do product.md), o
propósito e status da capability, os critérios de aceite que a comprovam
(com evidência citada, lida através de linhas de continuação), os ADRs
aceitos que a nomeiam, e uma seção History listando os changes arquivados
que a construíram (do ledger do index).

Reverso (um anchor como `SC1`): o texto do anchor no product.md, as
capabilities que o realizam — cada uma com status, estado de implementação
e razão de prova — e os changes arquivados por trás delas. Responde "quem
entrega esta promessa?".

Read-only nas duas direções.

## `doctrina constitution`

Imprime as regras vigentes do projeto em uma leitura.

```
doctrina constitution
```

Monta, read-only: os ADRs aceitos (as decisões imutáveis que governam como o
código evolui, mais antigos primeiro) e os `## Non-goals` do `product.md`. É
o análogo do `constitution.md` do Spec Kit — um único lugar para ver os
inegociáveis — mas não possui fatos próprios: para mudar um princípio,
substitua (supersede) o ADR; para mudar um non-goal, edite o `product.md`.

## `doctrina watch`

Mantém o projeto sincronizado e o agente orientado continuamente (ADR 0012).

```
doctrina watch
doctrina watch --once
```

Observa a árvore `.doctrina/` e, a cada mudança, roda `validate --fix` (cura
drift, migra o carimbo) e reimprime o `doctrina next`. Com debounce; ignora o
`index.json` que o próprio fix reescreve. Roda até ser interrompido (Ctrl-C);
`--once` roda uma única passada e sai (a forma scriptável/testável).

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
capability (quando dada — caso contrário, toda spec ativa, para que a
verdade corrente nunca falte) → changes abertas → ADRs com status
`accepted` — cada um com sua contagem de linhas, mais o total.
Skills são listadas à parte como nome + description apenas: são
on-demand por design, o corpo carrega só quando a tarefa casa. O
archive de changes e ADRs não-aceitos ficam de fora.

Cada arquivo carrega uma estimativa de tokens (chars/4) e o pack
reporta o total — a tese de context engineering tornada mensurável.

| Flag | Função |
|------|--------|
| `--concat` | Imprime o conteúdo dos arquivos com separadores em vez da lista — pronto para entregar a um agente. O veredito de budget (se houver) vai para stderr, mantendo o stdout puro. |
| `--budget <n>` | Orçamento de tokens do pack: imprime acima/abaixo e sai 1 quando a estimativa estoura (um gate de contexto para scripts/CI). |
| `--diff <ref>` | Restringe os artefatos estáveis (AGENTS.md, product.md, specs, ADRs) aos alterados desde o ref do git; changes abertas entram sempre. A leitura de retomada de sessão. |

É a seção de ordem de leitura do AGENTS.md virada em tooling:
seleção em vez de despejo. Read-only; sai 0 (ou 1 acima do `--budget`).

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

## `doctrina prime`

O primer de sessão: a leitura de ~40 linhas que orienta um agente no
início de uma sessão.

```
doctrina prime
```

Imprime, numa leitura só: o resumo dos gates (estado do index,
coverage %, âncoras do trace, checks do verify), as contagens de
artefatos, as regras vigentes (títulos dos ADRs aceitos + contagem de
non-goals — `constitution` tem o texto completo), cada change aberta
com seu progresso de tasks, e as próximas ações. Fica entre o
`status` (só números) e o `context --concat` (tudo): o bastante para
agir, barato o bastante para rodar toda sessão. Read-only; sempre
sai 0.

## `doctrina show <ref>`

Leitura pontual de um fragmento de artefato em vez do arquivo inteiro.

```
doctrina show cli-R12     # requisito 12 da spec cli (ordem do arquivo)
doctrina show cli-C3      # critério de aceitação 3 (numeração da spec)
doctrina show 0007        # ADR 0007 (a decisão inteira)
doctrina show cli         # só o bloco de headers + Purpose da spec
```

Um agente que precisa de um requisito não deveria reler uma spec de
400 linhas. Referências `R` são posicionais (deslocam quando um
requisito é inserido acima — cite-as para leituras pontuais e
conversa, não como identificadores imutáveis); referências `C` usam
os números explícitos dos próprios critérios. Read-only.

## `doctrina handoff`

Imprime uma nota de handoff de sessão em Markdown — o que a próxima
sessão (um agente novo, um colega, o você de amanhã) precisa para
retomar.

```
doctrina handoff
doctrina handoff > handoff.md
```

Contém: o resumo dos gates, cada change aberta com progresso task a
task (itens não marcados listados) e o comando exato de retomada
(`doctrina work --resume <id>`), e as próximas ações priorizadas.
Deliberadamente uma **view derivada, não um arquivo armazenado** — a
árvore é a verdade e nunca envelhece; regenere sob demanda. Read-only.

## `doctrina doctor`

Diagnóstico agregado: o comando único para quando algo parece errado
e você não sabe qual gate consultar.

```
doctrina doctor
```

Sequencia os checks existentes — `validate` (lido por máquina), o
check de drift do index, as razões de coverage/trace, o lint de
checkout limpo (`verify --clean`), o check de forma dos templates e a
presença de config do verify — e reporta cada área como ok/warn/FAIL
**com o comando exato de correção**. Um driver sobre comandos
existentes (como o `close`): não adiciona checks próprios, então
nunca discorda dos gates que apresenta. Read-only. Sai 1 quando
alguma área falha.

## `doctrina report`

Digest em Markdown para um período — a visão de standup / descrição
de PR.

```
doctrina report
doctrina report --since 30
```

| Flag | Default | Função |
|------|---------|--------|
| `--since <dias>` | `7` | Tamanho da janela em dias. |

Seções: estado dos gates, changes arquivadas na janela (do ledger do
index), trabalho aberto com progresso de tasks, contagens de
artefatos e um resumo do git local (commits, share de fix, arquivos
de maior churn). Read-only; sem rede. `doctrina metrics` tem os
números git mais profundos.

## `doctrina completion <bash|zsh|pwsh>`

Imprime um script de completion de shell, gerado do mesmo catálogo de
operações que alimenta o `--help` — o completion nunca conhece uma
superfície diferente da que o CLI entrega.

```
doctrina completion bash >> ~/.bashrc
doctrina completion zsh  > "${fpath[1]}/_doctrina"
doctrina completion pwsh >> $PROFILE
```

Completa comandos e seus subcomandos (flags não são completadas).
Saída estática — regenere após atualizar o CLI.

## `doctrina upgrade`

Traz um projeto existente para o CLI instalado após um npm update.
O projeto mantém o esqueleto da versão que o init-ou — carimbo do
framework defasado, um AGENTS.md anterior aos comandos novos, seções
recomendadas faltando — e nenhum outro comando fechava esse gap.

```
doctrina upgrade            # preview (sai 1 quando há passos pendentes)
doctrina upgrade --write    # aplica
```

Um orquestrador sobre as peças que já existem, em ordem:

1. `templates update` — **regenera o bloco doctrina:surface do
   AGENTS.md** a partir do catálogo do CLI instalado (o bloco é
   propriedade do CLI, ADR 0015 — é assim que agentes lendo o hub
   descobrem comandos adicionados desde o init; uma seção de superfície
   legada escrita à mão é substituída pelo bloco gerenciado), e anexa
   seções recomendadas / campos do index.json faltantes (apenas-aditivo
   fora do bloco).
2. `index rebuild` — regenera o index.json a partir da árvore e migra o
   carimbo `framework_version` para o CLI em execução.
3. `validate` (`--fix` sob `--write`) — mostra o que o upgrade não
   consegue corrigir (drift escrito à mão, checks novos do validate).

## Variáveis de ambiente

| Variável | Efeito |
|----------|--------|
| `NO_COLOR` | Desabilita ANSI no output (per https://no-color.org). |
| `FORCE_COLOR=0` | Mesmo que `NO_COLOR`. |
| `FORCE_COLOR` (qualquer outro valor) | Força cor mesmo quando stdout não é TTY. |

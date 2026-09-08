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
| `--debug` | Em erro inesperado, também imprime o stack trace. |

**A posição da flag não importa.** Cada comando declara as flags que
aceita, e o CLI faz duas passadas — a primeira resolve o nome do comando,
a segunda reinterpreta com as flags declaradas por ele. Então
`doctrina change new --chore meu-id "Título"` e
`doctrina change new meu-id "Título" --chore` são idênticos. Um teste
estático garante que toda flag que um comando lê, e toda flag que o
`--help` dele documenta no bloco Options, está declarada — uma flag não
declarada engolia o próximo argumento como valor e reportava um erro
enganoso.

## Códigos de saída

Um contrato de cinco classes (ADR 0018) — detalhe completo em
[exit-codes.md](exit-codes.md).

| Código | Classe | Significado | O que fazer |
|--------|--------|-------------|-------------|
| 0 | OK | Sucesso (warnings permitidos). | Continue. |
| 1 | GATE | Um gate falhou — o trabalho não está pronto. | Corrija e repita. |
| 2 | USAGE | Comando desconhecido, argumento ausente ou malformado. | Corrija a invocação. |
| 3 | PRECONDITION | O projeto ainda não está preparado para isso. | Rode o comando da linha `hint:`. |
| 4 | ENVIRONMENT | O ambiente não consegue executar. | Pare. |

## Saída legível por máquina (`--json`)

Todo comando aceita `--json`. Junto com o [contrato de códigos de
saída](exit-codes.md), os dois formam a interface de máquina: saída
estruturada mais um status com significado, para que um loop autônomo nunca
precise interpretar inglês.

Todo payload carrega o mesmo envelope:

| Campo | Significado |
|-------|-------------|
| `$schema_version` | A versão do contrato do payload. Hoje `1.0.0`. |
| `command` | A invocação que este payload descreve. |
| `ok` | `true` quando o comando teve sucesso. |
| `exit_code` | O status de saída do processo — a classe documentada em [exit-codes.md](exit-codes.md). |
| `deprecated` | **Presente só** quando o nome invocado foi substituído: `{ use, since, why }` — o comando substituto, a versão a partir da qual o nome antigo é legado, e o porquê. Ramifique pela presença da chave. |

Dois níveis de suporte, declarados em vez de escondidos:

- **Estruturado** — `validate`, `status`, `next`, `coverage`, `trace` montam
  um payload que descreve o resultado, ao lado dos campos do envelope.
- **Envelope** — todo outro comando devolve sua saída humana como arrays de
  strings `stdout` / `stderr` dentro do envelope, com ANSI removido.
  Ramifique por `ok` e `exit_code`; as linhas estão ali por completude, não
  para parsing.

Um comando sem nada melhor a dizer continua consumível por máquina, e é isso
que torna "`--json` em todo comando" um fato e não uma intenção. Mais
comandos ganham payloads estruturados com o tempo; os campos do envelope não
mudam de forma sem um bump de `$schema_version`.

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
| `--intake-text "<texto>"` | nenhum | O mesmo, inline, sem precisar escrever um arquivo antes. Mutuamente exclusivo com `--intake`; qualquer um dos dois escrito sem valor é erro de uso, nunca um projeto esqueletado sem o intake que você pediu. |
| `--date <YYYY-MM-DD>` | data do sistema | Sobrescreve a data nos artefatos. |
| `--force` | off | Re-esqueletiza um projeto que já existe. Reescreve apenas arquivos ainda **intocados**: quando o `AGENTS.md` ou o `.doctrina/product.md` carrega conteúdo que você escreveu, o `init` recusa e os nomeia (ADR 0016). |
| `--overwrite-content` | off | O segundo opt-in explícito que permite ao `--force` descartar `AGENTS.md` / `product.md` autorados. Sem ela, o `--force` sozinho não consegue destruí-los. |
| `--non-interactive` | off | Falha em vez de perguntar. |

O `init` precisa de uma descrição. Num terminal ele pergunta; fora de um
ele **recusa** (saída `2`) em vez de aceitar a string vazia que o EOF
devolve — isso esqueletizava um projeto com descrição em branco e sem
aviso. Passe `--project-description` ou `--intake`.

Num terminal interativo, o `init` também oferece a instalação de
adapter como passo de wizard quando `--agent` não foi passado
(responda `none` para pular); em pipes, CI ou sob `--non-interactive`
o prompt nunca dispara.

`init` recusa se `AGENTS.md` ou `.doctrina/` já existem, a menos
que `--force` seja passado.

**Para adicionar um agente a um projeto existente, use `doctrina adapter
add <nome>`** — não `init --force`. O `adapter add` é aditivo e nunca
toca em `AGENTS.md` ou `product.md`; o `init --force` re-esqueletiza e
agora recusa quando qualquer um dos dois carrega conteúdo autorado.

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

## `doctrina triage ["<prompt>"]`

Classifica um pedido **antes** de esqueletizar qualquer coisa, e
diagnostica o sistema em execução.

O `work` era a resposta para todo pedido, então um workflow quebrado, um
valor de env vazio e uma suíte que não rodou nada viravam changes com
proposal, tasks e delta de spec — meia hora de cerimônia para um bug que
o YAML já explicava, e um close que atestava um diagnóstico. Três raias,
porque três tipos de pedido falham de formas diferentes:

| Raia | O que significa | Para onde vai |
|------|-----------------|---------------|
| `PRODUCT` | muda comportamento; o delta de spec é o ponto | `doctrina work` |
| `RUNTIME` | ligado errado, vazio, ou não rodou nada; não há delta a escrever | diagnostique antes |
| `CHORE` | só implementação, já especificado | `doctrina work --chore` |

```
doctrina triage "o job de CI está verde mas 0 cenários rodaram"
doctrina triage            # sem prompt: só roda os checks de runtime
doctrina triage --env      # também checa o .env local
```

O classificador é casamento determinístico de termos e imprime os sinais
que casou — uma dica, como o palpite de capability do `work` (ADR 0005).
Nunca recusa. O `work` o consulta e **segura** um prompt confiantemente
de runtime com saída 3 (uma precondição, não um prompt ruim); `--force`
abre o change mesmo assim.

Com ou sem prompt, o `triage` também roda os checks de runtime sobre todo
contrato — os mesmos checks e o mesmo veredito do `contract check`: a
fiação declarada contra o workflow, defaults de consumidor com semântica
vazio-vs-ausente, enums declarados e seletores que não casariam nada.

| Flag | Função |
|------|--------|
| `--env` | Também checa o `.env` local contra os enums declarados. Reporta **apenas nomes e pertinência** — um valor rejeitado nunca é impresso, então a saída é segura de colar. |
| `--json` | Emite `{ lane, confident, contracts, declared, findings, errors }`. |

Sai 0 quando não há erro de runtime (warnings permitidos), 1 quando algum
erro permanece.

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

O change também ganha um **delta esqueletizado** em
`specs/<cap>/delta.md` com o header `**Operation:**` pré-preenchido
(`MODIFIED` quando a spec existe, `ADDED` quando não) — o delta era
historicamente o único arquivo 100% escrito à mão do fluxo, e um header
ausente só explodia dias depois no `analyze` do fechamento. Ele é escrito
sempre que a CLI consegue nomear a capability: por `--capability`, ou
pelo ranking quando o primeiro colocado supera o segundo por uma margem
real (um termo casado inteiro, que o desempate por tamanho sozinho nunca
produz). Um delta vindo do ranking é sempre `MODIFIED` — o ranqueador só
enxerga specs que existem — e carrega um comentário dizendo que é
palpite, com o score que venceu e o comando que corrige. Abaixo da
margem nada é escrito: um cara-ou-coroa colocado numa pasta é pior que
arquivo nenhum. O ranking do prompt esqueletiza; `--from-diff` e
`--chore` não.

| Flag | Função |
|------|--------|
| `--title "<curto>"` | Título curto de exibição: dirige o slug do id e o H1 da proposal; o prompt completo continua indo para o `## Why`. Sem ela, o id vira as primeiras palavras de conteúdo do prompt e o H1 mantém o prompt inteiro — curto para digitar, inteiro para ler. |
| `--capability <cap>` | Fixa a capability em vez de ranquear matches. O delta é pré-preenchido de todo modo; o pin apenas dispensa o comentário de palpite. |
| `--quiet` | Registra o change e imprime uma linha — sem playbook. Para registrar backlog ("anotar 19 works agora, começar nenhum"); reimprima depois com `--resume <id>`. |
| `--id <id>` | Sobrescreve o id de change derivado. |
| `--chore`, `--no-spec` | Abre um change de chore sem spec (infra/docs/build), com playbook que pula as etapas de delta. |
| `--force` | Sobrescreve uma pasta de change existente, e passa pela retenção de raia descrita abaixo. |

Antes de esqueletizar qualquer coisa, o `work` consulta o classificador de
raia (veja [`doctrina triage`](#doctrina-triage-prompt)). Um prompt que
confiantemente lê como problema de **runtime** — um workflow, um valor de
env, uma execução que não rodou nada — é **segurado** com saída 3 (uma
precondição: o trabalho pode estar certo, só não foi diagnosticado) e
apontado para o `triage`, para que nenhuma cerimônia seja gasta com um bug
que o YAML já explica. O classificador é casamento determinístico de
termos e pode errar: `--force` abre o change mesmo assim, e `--chore` é a
raia para fiação que a spec já cobre.

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

Um critério de aceitação ainda no formato placeholder do esqueleto — o
`<observable signal>` citando `path/to/test` que o `spec new` escreve — é
reportado pelo `validate`, porque a prova dele não resolve em lugar nenhum e
apareceria depois como falha de cobertura no close da próxima change que
tocar a capability.

O esqueleto também traz um header `**Realizes:**` (ADR 0011): nomeie os
anchors de critério de sucesso do `product.md` (`[SC1]`) que esta
capability entrega, ou registre `n/a — <porquê>` para uma capability
interna. A proveniência é opt-out — o `validate` avisa quando uma spec
`active` no eixo de implementação não declara header `Realizes:`, e o
`doctrina trace` reporta o elo intenção→capability. Um header que ainda
carrega o placeholder do próprio esqueleto conta como header ausente: o
escape é deliberado, e precisa ser acionado deliberadamente.

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
| `--implementation auto` | Define o estado que a **aritmética do coverage** sustenta: `verified` quando todo critério cita prova que resolve, `partial` quando alguns citam, `planned` quando nenhum cita. Recusa uma spec sem critérios de aceite em vez de chutar, deixando-a intacta. É a mesma derivação de que o `validate` avisa e que o `close` propõe como op `set-header` — veja [Gating](gating.md). |
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

**Gateado por `structure`** (ADR 0017): o `apply` recusa quando o
`analyze` reprovaria, e não escreve nada. As precondições pertencem à
transição, não ao comando que a dirige, então o `apply` exige exatamente o
que o caminho do `close` exige — um agente não consegue alcançar por um
caminho um estado que outro caminho proíbe. O `--force` dispensa a
*checagem* e registra o gap no ledger; não dispensa a operação, então um
apply forçado por cima de um delta malformado ainda falha ao tentar lê-lo.

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

Arquivar é o ato de declarar um change terminado, então ele é **gateado
por `verification`** (ADR 0017): o CLI **recusa** (exit 1) enquanto
qualquer caixa no `tasks.md` (incluindo os closing steps) ou na seção
`## Verification` do proposal estiver desmarcada. Ele deliberadamente não
re-roda o gate `structure` — aquele gate pergunta "isto é seguro de
aplicar?", e depois de um apply bem-sucedido a checagem de alvo ADDED
reportaria a prova do sucesso como conflito. Termine e marque os itens, ou passe
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
   tasks, headers de delta, alvos), incluindo a falha de change oco:
   `tasks.md` ainda com os `- [ ]` vazios do esqueleto significa que o
   change foi aberto mas nunca planejado.
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

Uma caixa sem texto é um **placeholder do scaffold** (o change foi
aberto mas nunca planejado): a listagem a marca como tal, e marcá-la é
recusado — escreva a task real (ou delete a linha) primeiro. `analyze`
e `close` falham duro com placeholders restantes, então um change oco
não fecha.

Toda superfície conta as mesmas caixas. O `prime`, o `report`, o
`handoff` e o `next` reportam um número de progresso por change, com os
placeholders incluídos: uma task não escrita é uma task que ninguém
terminou, e escondê-la foi o que deixou "tasks 0/3" significar seis
caixas abertas. O `tick` soma a isso as caixas de Verification do
proposal, porque elas dividem o espaço de ordinais dele, e nomeia de qual
arquivo veio cada ordinal.

## `doctrina change diff <id>` — depreciado

> **Depreciado.** Use `doctrina change check <id> --verbose`, que executa
> cada bloco de ops contra a spec alvo *e* imprime esta mesma pré-visualização
> por delta. O nome antigo continua funcionando, avisa no stderr, traz um
> campo `deprecated` no envelope do `--json` e será removido num minor
> futuro.

Pré-visualiza cada spec delta de uma change antes de aplicar.

```
doctrina change check 0042-add-saml --verbose   # preferido
doctrina change diff 0042-add-saml              # alias depreciado
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
| `--force` | Pula a confirmação. **Obrigatória fora de um terminal** — abandonar deleta trabalho sem desfazer, e o CLI não trata silêncio como consentimento. |

Sem `--force`, o `abandon` lista os arquivos que deletaria, diz que a
deleção não pode ser desfeita, e pergunta. Num stdin não interativo não há
a quem perguntar, então ele recusa (saída `2`) em vez de prosseguir.

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

**O ADR precisa dizer alguma coisa antes.** Um ADR aceito é imutável,
vira regra vigente no `prime --rules` e entra em todo pacote que ele
governa — então aceitar um cujo `Context`, `Decision` ou `Consequences`
ainda é o template embarcado é recusado, com as seções não escritas
nomeadas e nada escrito em disco. Uma linha de prosa real por seção basta;
o check é contra o molde, não contra o tamanho.

Reescreve só o header `Status:` — o corpo segue imutável — e re-deriva a
entrada inteira do index a partir do arquivo, então o resumo e o escopo que
você escreveu entre o `new` e o `accept` são os registrados. Qualquer outro
status atual (já aceito, superseded, withdrawn) é erro claro sem escrita
nenhuma. Fecha o ciclo de vida que o `decision new` abre; o `doctrina next`
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

## `doctrina decision scope [<número>]`

Mostra quais capabilities cada ADR governa e propõe uma para todo
ADR sem escopo.

```
doctrina decision scope
doctrina decision scope 0007
doctrina decision scope --write
```

Um ADR sem header `- **Scope:**` é **global**: ele entra em todo
pack de contexto, para sempre, porque ADRs são imutáveis e nunca se
aposentam. É isso que faz um pack de leitura padrão crescer com a
idade do projeto em vez de com a tarefa (ADR 0022). Escopo é a
correção — mas só se for adotado, e ninguém anota à mão quarenta
documentos imutáveis.

Então o escopo é proposto a partir de evidência que a árvore já
guarda. O change arquivado que cita um ADR registra quais specs
tocou (`changes_archive[].specs_affected`), e esse é o sinal mais
forte disponível: é o que de fato se moveu. Quando nenhum change
arquivado cita o ADR, o próprio texto dele é varrido em busca de
ids de capability e a sugestão vem marcada como
`text — confirm before writing`, porque ids de capability são
palavras comuns e um escopo de "tudo" equivale a nenhum escopo.

| Flag | Função |
|------|--------|
| `--write` | Aplica as sugestões, inserindo `- **Scope:**` após o header `Status:` de cada ADR. Sem ela, o comando apenas reporta. |

Revise o que ele escreve. Um escopo estreito demais esconde uma
decisão do pack que precisava dela, e nada detecta isso
automaticamente — a ferramenta propõe, você decide. Deixar um ADR
global é uma resposta legítima para decisões sobre a postura do
projeto e não sobre uma capability. Rode `doctrina index rebuild`
depois para refletir os escopos no `index.json`.

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

### `--from-error <texto|arquivo>`

As duas fontes acima disparam *depois do fato*: uma skill nasce quando
alguém lembra de escrevê-la, ou seja, depois que o incidente já custou uma
sessão. O momento em que a lição existe é o momento em que o erro está na
tela — e esse texto carrega exatamente o que um gatilho precisa.

```
doctrina skill suggest --from-error "$(cat falha.log)"
doctrina skill suggest --from-error ./falha.log --write
```

Ele rascunha **uma** skill a partir da falha, preenchendo o gatilho
`when:` com os paths, identificadores em CAIXA_ALTA, trechos entre aspas e
palavras distintivas do próprio erro — o campo que um humano tem menos
chance de escrever de forma casável, e o que o `context` ranqueia. O
procedimento continua sendo seu para escrever, enquanto você ainda lembra.
Um gatilho gerado sempre satisfaz o check de gatilho do `validate`. Passada
sem valor, é erro de uso (saída 2), nunca um fall-through silencioso para a
varredura comum.

## `doctrina adapter list` / `add` / `remove`

Adiciona, remove e inventaria os arquivos de adapter por agente que
apontam para o `AGENTS.md` (ADR 0016).

```
doctrina adapter list
doctrina adapter add gemini
doctrina adapter remove gemini
```

Antes deste comando, adicionar um adapter a um projeto existente
significava `doctrina init --agent <nome> --force` — e isso regenerava o
`AGENTS.md` e o `.doctrina/product.md` a partir de templates em branco,
destruindo regras escritas à mão e a definição de produto sem aviso. O
`adapter add` é **estritamente aditivo**: escreve apenas os arquivos
daquele adapter e nunca lê ou escreve `AGENTS.md`, `.doctrina/product.md`
ou qualquer outro artefato.

O `adapter list` reporta três estados, porque "nenhum adapter instalado" e
"nenhum adapter necessário" eram indistinguíveis:

| Estado | Significado |
|--------|-------------|
| `installed` | Os arquivos do adapter estão presentes neste projeto. |
| `available` | Ele entrega arquivos e nenhum está instalado. |
| `native` | O agente lê o `AGENTS.md` direto e não precisa de arquivo nenhum (`amp`, `codex`, `devin`, `factory`, `jules`). |

O `adapter remove` deleta apenas os arquivos que aquele adapter criou. Um
arquivo que você editou depois da instalação é seu — ele é mantido, e
nomeado, a menos que venha `--force`.

**Adapters customizados.** Um diretório em
`.doctrina/templates/adapters/<nome>/` é instalável por nome e tem
precedência sobre um adapter empacotado de mesmo nome. Os templates de lá
usam os mesmos tokens dos empacotados; o token `AGENTS_MD_PATH` resolve
para o caminho relativo correto conforme a profundidade do arquivo, então
um arquivo de comando aninhado aponta para `../../AGENTS.md` sozinho.

| Flag | Função |
|------|--------|
| `--force` | Com `add`, sobrescreve um arquivo existente; com `remove`, deleta um arquivo editado após a instalação. |

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
- `tasks.md` livre de **placeholders do scaffold** — um `- [ ]` vazio
  deixado do esqueleto (marcado ou não) é falha dura: o change foi
  aberto mas nunca planejado, e implementar em cima de um change oco é
  exatamente o modo de falha que isto bloqueia (o `validate` avisa a
  cada rodada; o `change tick` recusa marcar caixa vazia).
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
está presente e atual. Também verifica cada **ponteiro de hub**
instalado. Um ponteiro de hub é um arquivo de adapter cujo template
declara o token `{{AGENTS_MD_PATH}}` — `CLAUDE.md`, `GEMINI.md`,
`.cursor/rules/00-doctrina.mdc` e afins. São esses os arquivos que
roteiam o agente até o hub, e é por isso que um refresh do bloco de
superfície alcança todos os agentes instalados. Shims de slash command
(`.claude/commands/doctrina-*.md`) **não** são ponteiros: eles invocam o
CLI e chegam ao hub pelo arquivo-ponteiro pai, então exigir que citassem
`AGENTS.md` era uma falha falsa em toda instalação limpa.

Cada achado nomeia o comando que o resolve, ou diz claramente que o
reparo é manual. Um teste executa cada remédio impresso e verifica que o
achado sumiu — um remédio que o CLI não consegue executar e verificar não
é um remédio. Read-only; nunca modifica arquivos. Sai 0 quando toda seção
recomendada está presente, 1 caso contrário.

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
    traça a nenhuma intenção de produto (ADR 0011). Qualquer valor que o
    autor escreveu silencia, inclusive um deliberado `n/a — <motivo>`; o
    placeholder do próprio esqueleto não silencia, senão o check seria
    código morto no fluxo normal.
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

28. **Requisitos de pipeline ordenados.** Uma spec pode declarar um bloco
    opcional `### Pipeline`: passos numerados e o artefato que cada um
    entrega adiante. O EARS declara cada requisito event-driven de forma
    independente e nada diz sobre sequência, então "quando a execução
    termina, anexe o resumo" e "quando a análise conclui, publique o
    dashboard" passam os dois enquanto o dashboard renderiza uma análise
    que ainda não rodou. O invariante que uma lista numerada não consegue
    garantir sozinha — um passo só pode exigir o que um passo **anterior**
    produziu — vira erro:

    ```
    ### Pipeline

    1. run-suite — produces `reports/results.json`
    2. analyse — requires `reports/results.json`, produces `reports/analysis.md`
    3. publish — requires `reports/analysis.md`
    ```

    `PL01` é numeração fora de ordem, `PL02` um passo que exige o que um
    passo posterior produz (ele só consegue ler a cópia da execução
    anterior), `PL03` uma exigência que passo nenhum produz. Entradas
    externas ao pipeline são marcadas `(external)`. Opt-in: uma spec sem o
    bloco nunca é checada.
29. **Gatilhos de skill.** Uma skill cujo `when:` no frontmatter não nomeia
    nada concreto — nenhuma palavra-chave, path, comando ou string de erro
    — gera warning. O `context` ranqueia skills casando a tarefa contra
    esse gatilho, então um gatilho escrito em prosa pura ("sempre que
    parecer relevante") nunca dispara, e a skill só é carregada por quem já
    sabia que ela existia.

A flag `--fix` regenera o `index.json` a partir da árvore antes de
checar, então um índice em drift é reparado (e o carimbo
`framework_version` migrado) em vez de reportado — o pre-commit
instalado roda isso. `--runtime` roda adicionalmente o gate de runtime — a
fiação, os enums e os seletores declarados checados contra os workflows e
o código que deveriam honrá-los (os mesmos checks do `contract check`),
para que uma chamada cubra as duas metades da verdade. É opt-in porque lê
arquivos fora de `.doctrina/`. `--json` emite `{ ok, errors, warnings }`
para agentes e pipelines de CI.

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

Um projeto que não declara critério nenhum não tem razão a reportar, então
o coverage diz isso — *no criteria declared*, `pct: null` no `--json` — em
vez de marcar 100% sobre nada. O `status`, o `prime`, o `report`, o
`handoff` e o `doctor` renderizam a mesma ausência.

### Critérios de orquestração

Citação é a prova certa para "esta função se comporta" e a errada para "o
pipeline rodou". Um critério como *"a ausência do relatório é explícita e
o step não falha"* é satisfeito, no papel, por um job que executou zero
casos e imprimiu um empty state bem redigido: a citação resolve, a suíte
não está skipada, e o coverage chama isso de provado.

Marque tal critério com `[orchestration]` e cite uma **checagem do
verify** pelo nome, em vez de um arquivo:

```
3. [orchestration] a suíte e2e realmente executa cenários —
   verified by `verify:e2e`
```

Essa checagem precisa declarar uma guarda `expect` (veja
[`doctrina verify`](#doctrina-verify)). Uma checagem citada sem guarda é
reportada como **unguarded** e falha o `--strict`: uma checagem que sai 0
sem ter rodado nada satisfaria a alegação. Uma checagem nomeada que não
existe é **dangling**.

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

### Um sign-off manual vence

Uma assinatura é uma afirmação sobre o código num momento. Quando esse
código muda, a afirmação deixa de ser prova e vira histórico — então um
sign-off grava o commit em que foi feito e os `paths` que o check declara
cobrir (**declarados, nunca inferidos**, como todo o resto do
`verify.json`). O `verify` compara os dois com a árvore de trabalho e
reporta um de quatro estados:

| Estado | Significado | Passa? |
|--------|-------------|--------|
| **fresh** | assinado, e nada do que cobre mudou desde então | sim |
| **expired** | um caminho coberto mudou depois da assinatura | não |
| **unverifiable** | sem commit gravado, sem `paths` declarados, ou fora de um repositório git — então "mudou?" não tem resposta | não |
| **pending** | nunca assinado | não |

Só *fresh* passa. Os outros três são **não-bloqueantes por padrão e falham
sob `--strict`** — a regra que o `pending` sempre seguiu, mantida como uma
regra só em vez de duas. Mudanças commitadas e edições não commitadas
contam igual, porque a assinatura é sobre o código como ele está.

Uma assinatura feita antes disso existir não carrega commit, então é
reportada como **unverifiable**: nem confiada, nem chamada de vencida,
porque ninguém sabe que ela está. Uma re-assinatura resolve, e o `verify
--signoff` avisa na hora de assinar quando o check não declara `paths` —
uma assinatura sem âncora é uma que nada consegue cobrar do código.

O `status`, `prime`, `handoff`, `report` e `doctor` distinguem prova
EXECUTADA de prova ASSINADA, para que um verde total não esconda quanto
dele foi a palavra de uma pessoa.

### Expectativas de saída — fail-closed numa execução que não fez nada

Um exit code responde "o runner quebrou?", nunca "o runner rodou alguma
coisa?". Uma suíte cujo filtro não casou nenhum caso imprime `0 scenarios`
e sai 0, e todo gate chama isso de aprovação — um job verde que não testou
nada. Adicione um bloco `expect` para tornar a saída da execução parte do
veredito:

```
{
  "name": "e2e",
  "run": "behave --tags @smoke",
  "expect": {
    "fail_if_output_matches": "0 scenarios",
    "require_output_matches": "\d+ scenarios? passed"
  }
}
```

O Doctrina não fornece padrão nenhum e não sabe nada sobre o que a saída
significa — o projeto declara a linha que prova que sua execução foi real,
então isso funciona para qualquer runner em qualquer linguagem. Uma
checagem com `expect` continua **transmitindo**: a saída é ecoada no
terminal conforme chega, enquanto uma cópia se acumula para o casamento —
ler a saída de uma checagem não custa mais poder acompanhá-la. Um padrão
`expect` que não é uma expressão regular válida falha em **tempo de
config** com saída 2, nunca em silêncio.

Uma guarda `expect` também é o que um critério de aceite `[orchestration]`
cita como prova — veja [`doctrina coverage`](#doctrina-coverage).

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

`contract new` esqueletiza `.doctrina/contracts/<name>.md` (Ports,
Environment, **Wiring**, **Selectors**, **Budgets**, Interfaces,
References) e o indexa. `contract check` verifica a parte mecanicamente
checável.

**Estrutura:**

- **Colisão de portas** — dois serviços reivindicando a mesma porta é
  erro.
- **Drift de ambiente** — uma variável declarada no contrato mas ausente
  do `.env.example` é warning.
- **Specs referenciados** — todo `specs/<capability>` referenciado
  precisa existir (erro caso contrário).

**Runtime** — a declaração cobrada da implementação. O Doctrina não
aprende nenhum sistema de CI, test runner ou linguagem: cada check abaixo
lê um glob, padrão ou origem que o *contrato* declara.

| Código | O que falha |
|--------|-------------|
| `RT01` | Uma variável declarada com origem `vars`/`secrets` que nenhum bloco `env:` do workflow nomeado exporta. O valor existe na CI e nunca chega ao processo — toda a classe "configurei o secret e nada aconteceu". |
| `RT02` | O workflow a lê de outra origem, ou sob outro nome, do que o contrato declara. Exportar sob outro nome é rotina — o npm lê sua credencial de `NODE_AUTH_TOKEN` seja qual for o nome do seu secret — então declare a origem na célula Origin como `<origem>:<fonte>` (ex.: `secrets:NPM_TOKEN`). O RT02 então fica em silêncio enquanto os dois concordam e avisa no instante em que um dos lados se mexe. Origem sem fonte declarada continua avisando em qualquer renomeação, que é o default correto. Divergência de **origem** segue sendo erro nos dois casos: essa nunca é intencional. |
| `RT03` | O consumidor lhe dá um default que só se aplica quando a variável está **ausente**. A CI injeta a *string* vazia, que está presente, então `getenv(NOME, default)` nunca devolve o default. É um lint textual, e o achado diz isso. |
| `RT04` | Um enum `Values` declarado que o `.env.example` viola (erro), ou que o consumidor nunca menciona (warning — um enum que nada valida). |
| `RT05` | Um seletor declarado que casa zero alvos. Uma execução despachada nele roda 0 casos e ainda sai 0. Nomeia o quase-acerto quando só o separador difere (`smoke-test` vs `smoke_test`). |

Um contrato sem linhas de Wiring ou Selectors é reportado como **não
checado**, não como aprovado: silêncio não é prova. A linha de resumo diz o
mesmo — ela conta quantos contratos ficaram sem checar, e a palavra
*consistent* só aparece quando houve algo a verificar. É o resumo que
sobrevive no log de CI, então ele responde pelo mesmo padrão da linha por
contrato.

O `--json` responde com um payload em vez de prosa capturada: `contracts`,
`checked`, `unchecked`, `declared_rows`, `findings` e um `verdict` de
`consistent` / `unchecked` / `failed`. Ramifique pelo `verdict` — o `ok` e o
`exit_code` são 0 para superfície não declarada por decisão de projeto, então
sozinhos não distinguem "verificado" de "nunca declarado".

Sai 1 em erros, 0 só com warnings.

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
doctrina next [--json] [--run]
```

Inspeciona a árvore e reporta: declarações de runtime que não valem mais
(primeiro — uma fiação quebrada é o motivo de a última execução ter
mentido), changes abertas (proposal faltando, tasks desmarcadas, deltas
prontos para aplicar, aplicadas-mas-não-arquivadas), ADRs ainda em
status `proposed`, ADRs aceitos sem nada que os comprove ainda
(sugerindo `decision land`), um nudge único de captura de skill quando
nenhuma existe e uma change arquivada tem cara de fix, e o drift do
index por último (ADR 0011).

Num projeto que ainda não declara capability nenhuma, ele nomeia a porta de
bootstrap — `doctrina intake` para começar do zero, `doctrina work
--from-diff` para retroalimentar a partir de código existente — porque é o
momento em que um agente novo mais precisa dela e o momento em que nada mais
tem o que dizer.

Ele também recomenda sobre os sinais de **gate** que o `doctrina doctor`
reporta — critérios de aceitação sem cobertura ou citando evidência ausente
em disco, intenção de produto que nenhuma spec realiza, gate de build não
declarado, uma spec `active` cujo `Implementation:` ainda é um `planned`
pelado — a partir da mesma coleção que as vistas read-only renderizam, então
uma recomendação nunca contradiz a linha de onde veio. Esses sinais medem
capabilities, então ficam calados enquanto não existe nenhuma: um projeto
recém-inicializado é apontado para o `intake`, não convidado a escrever
critérios para capabilities que ainda não nomeou. Quando nada está aberto e
todo gate está satisfeito, diz isso e aponta para `intake` / `work`.

Read-only sem `--run`, e nesse caso sempre sai 0. Pensado para agentes e
humanos retomarem o trabalho sem reler a árvore inteira.

### Ações são registros, não prosa

`--json` emite `{ actions }`, onde cada ação é:

```json
{
  "id": "change-archive-pending",
  "command": "change archive",
  "args": ["0031-fix-parser"],
  "why": "applied but not archived",
  "gate": "archive",
  "severity": "blocking",
  "runnable": true,
  "text": "doctrina change archive 0031-fix-parser — applied but not archived"
}
```

Decida pelos campos `command` e `args` — o consumidor reemite a operação
sem interpretar inglês. `text` é a mesma linha que o terminal imprime,
construída a partir desses campos, então a frase e o registro não podem
divergir. `id` nomeia o TIPO da ação, não a instância, então é estável
para casar.

> **Mudança de payload.** Antes disso, `actions` era um array de strings.
> Um consumidor que apenas as imprimia continua funcionando via
> `actions[i].text`; um que concatenava o array precisa ser atualizado.

### `--run`

Executa a primeira ação **runnable** em processo e para — uma ação, não
a fila, porque a lista é recalculada a partir da árvore depois de cada
mudança nela. Sai com o código do próprio comando executado.

Uma ação é runnable somente quando executá-la sem supervisão é seguro E
é tudo o que a ação pede. Qualquer coisa que exija uma pessoa para
*decidir* nunca é runnable, por mais mecânica que seja a edição:

| Ação | Runnable | Por quê |
|---|---|---|
| `index rebuild`, `triage`, `intake`, `analyze` | sim | mecânica e idempotente |
| `change apply`, `change archive` | sim | têm gate próprio |
| aceitar uma ADR | **não** | isso é a decisão, não uma edição de cabeçalho |
| completar uma task | **não** | marcar a caixa não é fazer o trabalho |
| escrever uma proposal, capturar uma skill | **não** | autoria |

Sem nada runnable, `--run` nomeia a ação que precisa de uma pessoa e sai
0 — recusar não é falha. Use `doctrina close` quando quiser uma sequência
inteira executada para você.

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
| `--view <nome>` | Renderiza outra forma do mesmo snapshot: `dashboard` (padrão), `prime`, `handoff`, `report`. |
| `--since <dias>` | Com `--view report`: a janela (padrão 7). |
| `--json` | Emite o snapshot como JSON (forma estável para agentes e CI). O envelope não muda com `--view` — é um contrato de máquina. |

**Um coletor, quatro vistas.** `status`, `prime`, `handoff` e `report` são
quatro formas de *uma* coleta da árvore
(`packages/doctrina-cli/src/lib/snapshot.js`), renderizadas por funções
puras em `lib/views.js`. Antes disso eram quatro comandos que percorriam a
árvore cada um por si e importavam coletores de dentro dos módulos uns dos
outros — que é justamente como quatro superfícies acabam podendo reportar
números diferentes para o mesmo repositório. `prime`, `handoff` e `report`
continuam sendo comandos próprios (são o que o AGENTS.md manda o agente
rodar) e renderizam exatamente os mesmos bytes que `status --view <nome>`;
um teste garante essa identidade byte a byte, e outro proíbe para sempre
que um módulo de comando importe um binding de um módulo de comando irmão.

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
**review** (consultivo) → `change apply` → **runtime** → verify → `coverage --strict` → trace →
**docs** → `change archive` → validate → **skill suggest** (advisory:
lições fix-shaped ainda não capturadas, sugeridas enquanto estão
frescas), parando na primeira falha com o comando exato para reexecutar.
O gate de coverage é **escopado às capabilities que os deltas da change
tocam** (`--only` por baixo), então uma spec deliberadamente adiada em
outro canto da árvore não bloqueia um close que nunca a tocou; uma change
sem deltas gateia na árvore inteira. O verify é pulado (com aviso) quando
não há `verify.json`; o trace e os dois advisories nunca bloqueiam. É um
driver sobre os comandos existentes — adiciona uma checagem própria, o
gate de docs — então o agente faz uma chamada em vez de nove.

**O gate de runtime.** Os checks RT01-RT05 que o `doctrina contract
check` renderiza, rodando aqui como um passo: uma variável que o contrato
declara sob `vars`/`secrets` e que o workflow nomeado não exporta, um
default do consumidor que um valor vazio do CI nunca dispara, um enum
declarado que ninguém valida, um seletor que casa com zero alvos e mesmo
assim sai 0. Roda depois do `apply`, porque os deltas recém-mesclados são
justamente o que pode ter movido a superfície que o contrato descreve. A
severidade decide o nível: um **erro bloqueia** o close (reexecute com
`doctrina contract check`), um **aviso é reportado** e o close segue. Um
projeto sem contratos imprime uma linha e passa; contratos que não
declaram linhas de `Wiring`/`Selectors` são reportados como
**UNCHECKED**, nunca como aprovados — silêncio é ausência de declaração,
não prova de que o wiring vale. Nenhum check é duplicado: `close`,
`contract check`, `validate --runtime`, `triage` e `doctor` renderizam os
mesmos findings a partir da mesma fonte.

**O gate de docs.** Uma change que altera uma superfície documentada —
um comando, uma flag, um código de saída — só fecha quando a
documentação anda junto. Uma fase de docs agendada *depois* do trabalho
nunca acontece, então a exigência mora dentro do close. A detecção é
determinística dos dois lados: os sinais de superfície são lidos do
proposal e dos deltas da própria change (com o boilerplate do esqueleto
subtraído, para que as referências a comandos do próprio template não
sejam confundidas com intenção do autor), e se as docs andaram é lido do
git — a árvore de trabalho mais os commits deste branch contra o branch
padrão.

**O que conta como superfície é você quem declara.** O gate lê os nomes que
os seus `.doctrina/contracts/` afirmam — as tabelas Ports, Environment,
Wiring e Selectors e a seção `Interfaces` — então um comando, um endpoint,
uma variável de ambiente ou uma chave de configuração que o *seu* projeto
publica é superfície, do mesmo jeito que o ADR 0023 torna o runtime
declarado em vez de inferido. A superfície que uma change está
*acrescentando* ainda não está no contrato, então essa é reconhecida por
forma: uma rota, um método HTTP diante de uma rota, um identificador de
variável de ambiente, uma `--flag`, um código de saída. Um projeto sem
contrato recai no catálogo de comandos do próprio Doctrina e se comporta
exatamente como antes. Fora de um repositório git o gate não tem como ver o que mudou e
fica em silêncio em vez de acusar. Quando recusa, a dica nomeia os lugares
de documentação que o *seu* projeto tem — os subdiretórios de `docs/`, os
READMEs que ele traz, ou simplesmente "um README" quando ele ainda não
documenta em lugar nenhum — nunca um caminho ou um procedimento que só
existe no repositório do próprio Doctrina. O `--force` fecha mesmo assim e
registra o gap no ledger, exatamente como o `change archive --force`.

Vários ids fecham em sequência, cada um independente; o código de saída
é o pior resultado por id. Pré-visualize o que o close recusaria com
`doctrina change check <id>`.

| Flag | Função |
|------|--------|
| `--force` | Repassa ao `change archive` (arquiva mesmo com verificação incompleta) e fecha por cima de um gate de docs reprovado — ambos registram o gap. |

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

## `doctrina constitution` — depreciado

> **Depreciado.** Use `doctrina prime --rules`, que imprime exatamente estas
> linhas, da mesma coleção. O nome antigo continua funcionando, avisa no
> stderr, traz um campo `deprecated` no envelope do `--json` e será removido
> num minor futuro.

Imprime as regras vigentes do projeto em uma leitura.

```
doctrina prime --rules      # preferido
doctrina constitution       # alias depreciado
```

Monta, read-only: os ADRs aceitos (as decisões imutáveis que governam como o
código evolui, mais antigos primeiro) e os `## Non-goals` do `product.md`. É
o análogo do `constitution.md` do Spec Kit — um único lugar para ver os
inegociáveis — mas não possui fatos próprios: para mudar um princípio,
substitua (supersede) o ADR; para mudar um non-goal, edite o `product.md`.

Um non-goal pode ser um bullet ou um parágrafo — o comentário do próprio
template daquela seção convida prosa — e uma linha em branco separa um do
próximo. O comentário instrucional do template nunca é lido como um non-goal
declarado.

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

**Estados de primeira execução.** Um repositório sem commits, ou um
diretório que não é repositório, é um estado válido e não uma falha: o
`metrics` reporta "nada a medir ainda" e sai com `0`. O mesmo vale para
`report`, `review` e `skill suggest`. Só a ausência do git na máquina é
erro de ambiente (saída `4`). O `context --diff` ainda falha quando não
consegue calcular o diff, mas nomeia a condição em vez de vazar plumbing
do git.

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

Cada arquivo carrega uma estimativa de tokens (chars/4), e o pack é
**montado para caber num orçamento de tokens** em vez de apenas ser
medido contra um (ADR 0022). O orçamento resolve como `--budget` >
`config.context_budget` no `index.json` > `15000`.

Acima do orçamento, artefatos degradam antes de qualquer um ser
descartado, do menos relevante primeiro: um ADR aceito para título
+ sua decisão em uma frase, a spec de uma capability não nomeada
para título + propósito. Toda degradação e omissão é nomeada no
relatório. O core — regras raiz, verdade de produto, a spec da
capability nomeada, changes abertas — nunca é degradado nem
descartado; quando só ele já estoura o orçamento, o comando diz
isso e sai com 1.

Nomear uma capability também exclui os ADRs cujo escopo a deixa de
fora. Um ADR sem header `- **Scope:**` é global e aparece em todo
pack; veja [`doctrina decision scope`](#doctrina-decision-scope-number).

| Flag | Função |
|------|--------|
| `--for "<tarefa>"` | Ranqueia o pack por relevância a uma descrição de tarefa, para que o que sobrevive ao orçamento seja o que a tarefa é. O ranqueamento é cobertura de termos e depois densidade, nunca tamanho do documento. Ele lê o **léxico compartilhado** (`packages/doctrina-cli/src/lib/lexicon.js`), o mesmo com que o `doctrina work` ranqueia um prompt — os dois não têm como discordar sobre qual capability uma tarefa é, o que importa porque o playbook do work manda o agente rodar um logo depois do outro. O léxico dobra acentos (um prompt em português casa com uma spec em ASCII) e descarta os verbos que todo prompt carrega — "add", "new", "criar", "implementar" — junto com a gramática, já que nenhum deles diz *qual* capability. |
| `--concat` | Imprime o conteúdo dos arquivos com separadores em vez da lista — pronto para entregar a um agente. O veredito de budget vai para stderr, mantendo o stdout puro. Artefatos degradados saem como título + resumo + um ponteiro para o texto completo. |
| `--budget <n>` | Teto de tokens desta chamada, sobrepondo o `config.context_budget` do projeto. |
| `--diff <ref>` | Restringe os artefatos estáveis (AGENTS.md, product.md, specs, ADRs) aos alterados desde o ref do git; changes abertas entram sempre. A leitura de retomada de sessão. |

Sem capability e sem `--for` não há sobre o que recuperar, então o
pack degrada para um índice de orientação: cada capability por
título e propósito, cada decisão por título e resumo. Nomear uma
capability é como você pede a verdade dela por inteiro.

É a seção de ordem de leitura do AGENTS.md virada em tooling:
seleção em vez de despejo. Read-only; sai 0, ou 1 quando só o core
do pack não cabe no orçamento.

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
non-goals), cada change aberta com seu progresso de tasks, e as
próximas ações. Fica entre o `status` (só números) e o
`context --concat` (tudo): o bastante para agir, barato o bastante
para rodar toda sessão. Read-only; sempre sai 0.

| Flag | Função |
|------|--------|
| `--rules` | Imprime as regras vigentes por INTEIRO em vez do primer: cada ADR aceito e cada non-goal declarado. As linhas que o `doctrina constitution` imprimia, da mesma coleção. |

O primer tem tamanho fixo de propósito — ele é lido no início de toda
sessão — então o texto completo dos non-goals mora atrás de `--rules`,
não dentro do primer.

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
os números explícitos dos próprios critérios. As duas contam apenas
conteúdo autoral: um bullet dentro de um comentário HTML — a legenda
EARS que o scaffold da spec traz, por exemplo — é anotação e nunca
entra na numeração. Read-only.

O `replace-requirement <seção> <n>` de um delta de spec numera de
outro jeito, e de propósito: conta dentro de uma `### <seção>`, então
o número dele não se mexe quando outra seção cresce. O `doctrina show
<cap>-RN` imprime a seção em que o requisito caiu, e é isso que
transforma uma referência `R` no par de coordenadas do delta.

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

Sequencia os checks existentes — os checks estruturais (`validate`), o
check de drift do index, as razões de coverage/trace, o lint de
checkout limpo (`verify --clean`), o check de forma dos templates, a
superfície de **runtime** e a presença de config do verify — e reporta
cada área como ok/warn/FAIL **com o comando exato de correção**. Um
driver sobre as mesmas coleções que os gates renderizam (como o
`close`): não adiciona checks próprios, então nunca discorda dos gates
que apresenta, e a execução inteira é um processo só — ele não inicia a
CLI de novo para responder a uma linha. O `close` funciona igual: um passo
que a sequência dele declara mas o driver não implementa é reportado como
não implementado, nomeando o comando que responde, em vez de virar um
segundo processo. Uma pergunta, uma resposta, nos dois drivers.
Read-only, o que aqui também
quer dizer que ele nunca repara: `validate --fix` cura um índice em
drift, o `doctor` apenas reporta. Sai 1 quando alguma área falha.

A linha de runtime reporta um projeto com contratos mas sem linhas de
Wiring ou Selectors como **não checado**, nunca como ok: uma superfície
não declarada não é uma superfície verificada.

| Flag | Função |
|------|--------|
| `--env` | Também checa o `.env` local contra os nomes e enums declarados. Reporta apenas pertinência — um valor rejeitado **nunca é impresso**, então a saída é segura de colar numa issue ou num log de CI. |

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
| `--agent-changelog` | off | Rascunha o bloco "What changed" do AGENTS.md em vez do digest. |

Seções: estado dos gates, changes arquivadas na janela (do ledger do
index), churn por capability (do ledger do archive), trabalho aberto
com progresso de tasks, contagens de artefatos e um resumo do git
local (commits, share de fix, arquivos de maior churn). Read-only; sem
rede. `doctrina metrics` tem os números git mais profundos.

### Rascunhando o changelog do agente

`--agent-changelog` responde outra pergunta, para outro público: o que
um agente que chega na próxima release precisa fazer de diferente? Ele
propõe um bullet candidato por change arquivada que tocou uma
**superfície documentada** — um comando, uma flag, um código de saída —
do mais novo para o mais antigo, limitado aos cinco bullets que o bloco
permite. A janela é "desde a última tag", a menos que `--since` diga
outra, e a saída declara qual janela usou.

```
doctrina report --agent-changelog
```

Ele **propõe**; uma pessoa corta e reescreve. O rascunho sabe qual
superfície a change tocou, não o que um agente deve fazer a respeito, e
esse juízo não é da CLI (ADR 0005). Uma change que não tocou superfície
documentada não propõe nada — o que é uma resposta válida, não uma
resposta vazia. O teto também não é preferência de estilo: o
`AGENTS.md` é contexto sempre carregado com orçamento de linhas rígido,
então candidatos que não couberem são listados e deixados para você
escolher, nunca descartados em silêncio.

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

## `doctrina ci --emit <target>`

Emite o pipeline de CI da sequência de gates declarada, no stdout.

```
doctrina ci --emit github > action.yml
```

Quais gates um pipeline roda é declarado uma vez, em `SEQUENCES.ci`
(`packages/doctrina-cli/src/lib/gates.js`) — a mesma declaração que o
`close` executa passo a passo e que o `doctor` reporta como linhas.
Antes disso havia quatro listas mantidas à mão (o array do close, as
linhas do doctor, o `action.yml`, o `verify.json`) e nada que percebesse
quando divergiam, e foi assim que um gate pôde estar no close e ausente
do CI por um release inteiro.

A action continua **versionada no repositório** em vez de gerada sob
demanda: um projeto que escreve `uses: <owner>/<repo>@v1` não tem CLI
para gerá-la, e uma action composta que só existe depois de um npm
install não é uma action. O fluxo é: mude a declaração, re-emita,
comite o resultado. Um teste de drift compara o `action.yml` versionado
com a saída deste comando byte a byte, então um arquivo desatualizado
quebra a suíte em vez de ir para produção em silêncio.

Somente leitura — não escreve nada, então redirecione você mesmo.

| Target | Saída |
|--------|-------|
| `github` | Uma GitHub Action composta (o `action.yml` deste repositório). |

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

   O bloco carrega um **gatilho por comando** — o que ele faz e o momento
   em que você o usa (ADR 0020) — e tem um orçamento declarado de 40 linhas
   que o `templates check` cobra. Ao lado dele, um bloco gerado
   `## What changed in <versão>` de três a seis linhas diz apenas o que
   altera o comportamento do agente, para que um agente lendo o AGENTS.md
   após um upgrade descubra o que é novo sem que ninguém mande olhar.

   O bloco tem **uma posição canônica**, definida pelo template
   entregue e usada tanto pelo `init` quanto pelo `upgrade`: logo após
   "Working from intent". Um projeto sem bloco recebe um posicionado
   ali, em vez de anexado ao fim, para o upgrade não enterrar a
   superfície de comandos atrás de tudo que o agente lê primeiro. Rodar
   duas vezes é no-op. No preview, a mudança pendente aparece como um
   diff real — as linhas que mudariam, ou o corpo do bloco e seu
   destino — em vez de um resumo de uma linha.
2. `index rebuild` — regenera o index.json a partir da árvore e migra o
   carimbo `framework_version` para o CLI em execução.
3. `validate` (`--fix` sob `--write`) — mostra o que o upgrade não
   consegue corrigir (drift escrito à mão, checks novos do validate).

Um único `upgrade --write` cobre **todos os agentes instalados**: os
adapters (CLAUDE.md, GEMINI.md, `.cursor/rules/…`, …) são ponteiros
finos para o AGENTS.md e não carregam superfície de comandos própria,
então atualizar o bloco do hub É atualizar o que todo agente lê. O
`templates check` (passo 1) verifica que cada adapter instalado ainda
aponta para o hub.

## Variáveis de ambiente

| Variável | Efeito |
|----------|--------|
| `NO_COLOR` | Desabilita ANSI no output (per https://no-color.org). |
| `FORCE_COLOR=0` | Mesmo que `NO_COLOR`. |
| `FORCE_COLOR` (qualquer outro valor) | Força cor mesmo quando stdout não é TTY. |

# Orquestrando trabalho entre repositórios

> Tradução da [versão em inglês](../en/workspace.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Uma tela, uma história ou uma correção raramente mora num repositório só.
Uma tela de login nova mexe na API do `back-end`, num componente do
`front-core`, na página do `front-feature` e nos testes que provam tudo
isso. Este guia é o manual de operação desse caso: uma pessoa que analisa
e aprova, um agente **planejador** que lê o trabalho e o delega, e agentes
**executores** que fazem, cada um, uma tarefa num repositório
([ADR 0029](../../.doctrina/decisions/0029-o-contexto-de-varios-repositorios-mora-num-workspace-privado-ligado-por-link-e-oculto-do-git-do-repositorio.md),
[ADR 0030](../../.doctrina/decisions/0030-um-planejador-orquestra-um-escritor-por-repositorio-executores-recebem-cartoes-autocontidos.md),
[ADR 0031](../../.doctrina/decisions/0031-o-workspace-declara-as-ferramentas-e-o-agente-as-guarda.md)).

O fluxo sem amarrar ferramenta — quem faz o quê, passo a passo — está em
[O fluxo de ponta a ponta](end-to-end-flow.md); esta página é a preparação
em detalhe. Os nomes de ferramenta abaixo são exemplos; qualquer servidor
MCP serve.

## 1. Crie o workspace

```
doctrina workspace init ~/work/acme-ws --name acme
cd ~/work/acme-ws
doctrina workspace add ../back-end      --role back  --about "API REST: auth, pedidos"
doctrina workspace add ../front-core    --role front --about "design system e casca" --depends-on back-end
doctrina workspace add ../front-feature --role front --about "telas de checkout e conta" --depends-on front-core
```

O workspace é um **repositório git privado**. Um repositório que já tem
`.doctrina/` é registrado **in-repo**. Um que não tem — ou cujo time não
autoriza a pasta — vira **sombra**: o `.doctrina/`, o AGENTS.md e o
adaptador do agente moram em `projects/<nome>/` do workspace, são ligados
ao repositório e escondidos do git dele pelo `.git/info/exclude`. Nada é
commitado lá; o histórico do próprio workspace é o histórico de versões do
contexto.

## 2. Absorva o que não tem spec

O `doctrina workspace list` marca como `pending` um projeto sem spec.
Absorva-o uma vez, a partir do código:

```
cd ../front-core && doctrina intake --from-code
```

O intake vira o **inventário do código** — stack, testes, CI, áreas
candidatas, comandos de build, nomes de variáveis de ambiente (nunca os
valores) — e o playbook de absorção pede ao agente que descreva o que o
código faz hoje, como um baseline pequeno, e que mande para você, como
perguntas abertas, o que o código não diz.

## 3. Declare as ferramentas

```
doctrina workspace tool jira            # presets: jira, confluence, figma,
doctrina workspace tool confluence      #   playwright, datadog, databricks, sql
doctrina workspace tool figma
doctrina workspace tool playwright
doctrina workspace tool datadog
doctrina workspace tool databricks --access read
```

Cada ferramenta nomeia o servidor MCP como a configuração do seu agente o
chama (`--server` troca o preset), os papéis que a usam (`--for`) e o
acesso — **leitura**, a menos que você diga `--access write`. O Doctrina
nunca chama uma ferramenta. Ele instala um hook antes de cada chamada
(Cursor `beforeMCPExecution`, Claude Code `PreToolUse`) que responde a toda
chamada MCP a partir dessa declaração: uma escrita por uma ferramenta só
de leitura é recusada, uma escrita por uma ferramenta de leitura e escrita
espera você, e um servidor que o workspace não declara fica de fora.

## 4. Abra o workspace no seu agente

Toda escrita no workspace, e todo `doctrina workspace list`, regenera os
arquivos do orquestrador na raiz:

| Arquivo | Para |
|---|---|
| `AGENTS.md` | O hub do planejador: projetos, ferramentas, o ciclo, as regras |
| `.cursor/rules/00-doctrina-workspace.mdc` | A regra sempre aplicada do Cursor |
| `.cursor/hooks.json`, `.claude/settings.json` | Primer da sessão e guarda de MCP (mesclados com os seus) |
| `.claude/agents/doctrina-*.md` | Subagentes — lidos pelo Claude Code e pelo Cursor |
| `<nome>.code-workspace` | Abre o workspace e todos os repositórios numa janela só |

Abra o `<nome>.code-workspace` no Cursor (ou rode `claude --add-dir` para
cada repositório). A sessão começa com `doctrina prime`: projetos, entregas
abertas, ferramentas.

Os subagentes são `doctrina-executor` e `doctrina-reviewer` sempre,
`doctrina-qa` quando uma ferramenta serve `qa` (Playwright, Figma) e
`doctrina-observer` quando uma serve `observer` (Datadog). Para rodar os
executores num modelo menor, configure no `workspace.json` — `"agents": {
"executor": { "model": "<id>" } }` — e rode `doctrina workspace list` para
regenerar. O Cursor aceita um id de modelo como `composer-2`; o Claude
Code aceita `sonnet`, `haiku` ou um id completo. `inherit` usa o modelo do
planejador.

## 5. Entregue

Leve o item de trabalho ao planejador — "chegou a SHOP-42, é a tela de
login com bloqueio". O planejador roda:

```
doctrina delivery new "Tela de login com bloqueio" --ref SHOP-42
```

e segue o playbook que ele imprime:

1. Ler a história pela ferramenta do rastreador e copiá-la **literalmente**
   em `## Story`; linkar as docs e os designs em `## Sources`.
2. Rotear — `doctrina delivery route 1 back-end,front-core` — dependências
   primeiro. Um repositório ainda `pending` (sem spec) ou `missing` é
   recusado com saída 3: absorva antes (seção 2), ou passe `--force`.
3. Em cada repositório, abrir UMA change: `doctrina work "<título>"
   --delivery <id>`; escrever o delta e as tarefas como **cartões**:

   ```
   - [ ] Bloquear a conta depois de 5 tentativas erradas
     - Files: src/auth/lockout.ts, test/auth/lockout.test.ts
     - Requirement: auth-R7
     - Verify: npm test -- lockout
   ```

   O `Requirement:` é uma referência do `doctrina show` — `auth-R7` é
   contado a partir da spec, nunca escrito nela — ou, para um requisito
   que o delta acrescenta, o requisito em palavras.

   Uma change aberta sem `--delivery` entra nela depois:
   `doctrina work --resume <change> --delivery <id>`.

4. Entregar cada cartão — `doctrina change card <id>` — ao
   `doctrina-executor` (ou ao `doctrina-qa`). **Um escritor por repositório
   de cada vez**; repositórios diferentes podem andar em paralelo.
5. Revisar com o `doctrina-reviewer` e fechar cada change ele mesmo:
   `doctrina close <id>`. Executores nunca fecham.
6. Registrar a subida em `## Release` (pipeline, ambiente, evidência) e
   marcar cada afirmação ali — `doctrina delivery tick <id>` lista,
   `doctrina delivery tick <id> <n>` marca uma. Registrar o que foi
   observado depois em `## Observability` — o `doctrina-observer` lê os
   monitores.
7. `doctrina delivery check <id>` → `doctrina delivery close <id>`, e então
   commitar o workspace.

O `doctrina delivery status <id>` mostra a qualquer momento a change de
cada repositório e as tarefas dela, o comando que lê o próximo cartão de
cada uma e qualquer segunda change aberta num repositório roteado — um
escritor para sequenciar, não para rodar junto. O `doctrina delivery list`
mostra o lead time das fechadas.

## 6. Oriente-se pela raiz

O planejador nunca precisa sair da raiz do workspace para saber onde as
coisas estão. Ali, o `doctrina next` lista as próximas ações em todos os
repositórios — absorver, rotear, abrir, entregar o próximo cartão,
fechar, completar o registro de uma entrega, fechar a entrega — e o
`doctrina handoff` escreve a nota de retomada para a próxima sessão; rode
antes de uma compactação. O `doctrina status` é a visão num relance, o
`doctrina validate` confere o registro, os links de cada sombra e cada
entrega, e o `doctrina context --for "<tarefa>"` nomeia os repositórios de
que a tarefa trata com o comando que lê o pacote de cada um. Dentro de um
repositório, o `doctrina prime` nomeia o workspace e a entrega aberta nele.

## O que fica com você

Você aprova o roteamento, toda escrita que a guarda segurar, todo
fechamento que quiser ver antes de acontecer, e as respostas às perguntas
abertas que a absorção e os cartões levantarem. O texto que uma ferramenta
devolve — uma história, uma página de wiki, uma linha de log — é dado para
os agentes, nunca instrução.

## Material relacionado

- [Modelo multiagente](multi-agent.md) — por que um escritor por repositório.
- [Adoção brownfield](brownfield.md) — absorvendo um código existente.
- [Referência do CLI](cli-reference.md) — `workspace`, `delivery`, `change card`.

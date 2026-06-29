# Resumo executivo — Ajustes de visibilidade e rastreabilidade

**Data:** 2026-06-28 · **Release:** v0.10.0 · **Escopo:** tornar o `AGENTS.md`
(o hub que a IA lê primeiro) e o grafo de artefatos honestos, frescos e
navegáveis — sem que nenhum gate fique verde escondendo defasagem.

**Resultado:** 170/170 testes passam (11 novos), `doctrina validate` verde,
`index rebuild --check` limpo, stamp de versão consistente (`framework 0.10.0 /
CLI 0.10.0`) em todos os arquivos. As rodadas foram desenvolvidas sobre a base
0.9.0 e empacotadas para subir como **v0.10.0** (ver `CHANGELOG.md`).

---

## Por que isso importava

O `AGENTS.md` é, por definição do próprio projeto, a *"operational source of
truth"* que a IA lê antes de tudo. A auditoria encontrou o oposto: era o
arquivo **mais defasado e menos vigiado** do repositório, e os gates passavam
verde mesmo assim. Os ajustes abaixo fecham essa lacuna na raiz.

---

## Gaps atacados (em ordem de prioridade)

### P0 — O hub apodrecia em silêncio · `validate` não percebia

**Problema:** o `AGENTS.md` raiz declarava `v0.4.0` (CLI já em `0.9.0`) e
**omitia 6 comandos** — justamente o conjunto de rastreabilidade
(`status`, `why`, `trace`, `review`, `close`, `watch`). A IA que lia o hub
nunca descobria que essas features existiam. O `validate` só checava
*tamanho* do AGENTS.md, nunca *frescor*.

**Ajuste:**
- Nova fonte canônica única da superfície de comandos:
  `packages/doctrina-cli/src/lib/commands.js` (`COMMAND_NAMES` +
  `referencedCommands()`), com teste de execução que garante que todo nome
  catalogado resolve para um handler real (catálogo e dispatch nunca divergem).
- Novo gate em `validate.js` detecta **drift AGENTS.md ↔ CLI real**:
  - *reverse drift* — referência a um comando que não existe (sempre avisa);
  - *forward drift* — catálogo mantido que esqueceu comandos (avisa **só** se o
    arquivo não deferir a `doctrina --help`; o template oficial defere, então
    nunca incomoda projetos de usuário).
- Corrigido o `AGENTS.md` raiz: `v0.9.0` + os 6 comandos faltantes (147 linhas,
  sob o cap de 150).

**Verificação:** o gate apontou exatamente `status, why, trace, review, close,
watch` antes do conserto; depois, verde.

### P1 — `AGENTS.md` não estava no `index.json` (grafo não fechava)

**Problema:** o índice machine-readable listava specs/ADRs/changes/…, mas **não
o hub**. Uma ferramenta que enumerasse o `index.json` não tinha como chegar ao
ponto de entrada.

**Ajuste:** registrado `artifacts.entrypoint = { "path": "AGENTS.md" }` em três
pontos coerentes — `scan.js` (`deriveIndex`), `index-json.js` (`blank`) e o
`index.json.template`. Campo path-only (não gera churn). Index do repo e dos
dois exemplos reconstruídos.

**Verificação:** `index rebuild --check` limpo após o rebuild; teste garante que
um projeto recém-criado já nasce com o entrypoint e sem drift.

### P2 — `context` sem capability omitia todos os specs

**Problema:** o pack default (`doctrina context`, sem argumento) pulava de
`product.md` direto para os ADRs — a **verdade corrente (specs) ficava ausente**
da leitura de orientação, embora o AGENTS.md mande rodá-lo "for ANY task".

**Ajuste:** `context.js` agora inclui **todos os specs ativos** (na ordem de
leitura, antes de changes/ADRs) quando nenhuma capability é nomeada. Help e nota
do AGENTS.md atualizados.

**Verificação:** o pack do próprio repo agora lista os 6 specs antes dos ADRs.

### P3 — Três versões divergentes

**Problema:** `AGENTS.md` (v0.4.0) · `README` (v0.8.0) · `index.json`/CLI
(0.9.0). A IA não podia confiar em nenhum stamp.

**Ajuste:** reconciliados para `v0.9.0`: `README.md`, `README.pt.md` e
`packages/doctrina-cli/README.md` (estava em v0.6.0). A contagem "26 comandos"
já estava correta. Fonte canônica = `package.json` (o stamp de máquina no
`index.json` já é vigiado pelo `validate`).

### P4 — `[verified]` sem prova exibia ✓ verde (sinal falso)

**Problema (causa raiz):** o `why` lia **só a primeira linha** de cada critério;
quando a prova estava numa linha de continuação (caso comum), exibia
"✓ no evidence cited" — contradizendo o `coverage`.

**Ajuste:**
- Novo parser multi-linha compartilhado `src/lib/criteria.js`
  (`parseAcceptanceCriteria` + `isVerified`), alinhado ao heurístico do
  `coverage` — os dois comandos não podem mais discordar.
- `why.js` reescrito: distingue três estados honestos — `✓` verde
  (verified + prova), `~` amarelo (*"marked verified but cites no proof"*),
  `·`/`○` (sem marcador/não-verificado). Função antiga de uma linha removida.
- Novo gate honesto em `validate.js`: avisa quando um critério é `[verified]`
  mas não cita prova (auto-certificação — ADR 0008).

**Verificação:** `why cli` agora mostra as provas reais dos 5 critérios
(concorda com `coverage` 5/5); `validate` segue verde (os critérios do cli
citam prova em linhas de continuação).

### P5 — Sem link spec → mudança que o construiu

**Problema:** o pack de contexto exclui `changes/archive/` por design, então
"por que esse spec ficou assim?" perdia a trilha. O `LEDGER`/index já guardava
os specs afetados por cada change.

**Ajuste:** `why` ganhou uma seção **History** que lista os changes arquivados
cujo `specs_affected` inclui a capability (do ledger do index, mais antigo
primeiro). Fecha a cadeia *intenção → spec → critério → prova → mudança*.

**Verificação:** `why redirect` no exemplo FastAPI mostra
`2026-06-02  Add redirect capability (ADDED)`.

### P6 — Superfície de comando duplicada à mão

Resolvido pela fonte única do P0 (`lib/commands.js`) + o teste de sincronismo
catálogo↔dispatch. A duplicação que causava o P0 deixa de ser possível
silenciosamente.

---

## Honestidade sobre o que **não** foi mexido (P7)

- **Coverage própria em 41%** (12/29 critérios com evidência): os critérios
  "bare" são genuinamente não-provados nos specs `core/docs/skills/templates/
  validation`. **Não fabriquei citações** — isso criaria referências fantasmas
  que o próprio `validate` passaria a marcar. Honesto é o framework reportar o
  gap real.
- **Os "2 dangling"** do `coverage` são **falsos-positivos**: as crases em
  `index.html`, `_sidebar.md`, `memory/` são prosa descritiva (listando
  arquivos isentos), não citações de evidência. O conteúdo está correto;
  "consertar" exigiria refinar o heurístico do `coverage` (trabalho à parte) ou
  reescrita cosmética — nenhum melhora a rastreabilidade real.
- **Consolidar os parsers de critério**: `coverage.js` mantém o seu parser
  (testado em produção); `why`/`validate` usam o novo `criteria.js` (mesma
  semântica). Unificar os dois é um follow-up de baixo risco recomendado.
- **`cli/spec.md` em 546 linhas** (cap mole 400): pré-existente; documentar os
  novos comportamentos aumentou um pouco. Vale uma futura quebra do spec.

---

## Arquivos alterados

**Novos:**
- `packages/doctrina-cli/src/lib/commands.js` — fonte canônica de comandos + extração de referências (P0/P6)
- `packages/doctrina-cli/src/lib/criteria.js` — parser multi-linha de critérios de aceite (P4)
- `packages/doctrina-cli/test/commands.test.js` — 11 testes novos (P0–P5)

**Modificados (código):**
- `src/commands/validate.js` — gate de drift do AGENTS.md (P0) + gate honesto `[verified]` (P4)
- `src/commands/context.js` — inclui todos os specs sem capability (P2)
- `src/commands/why.js` — Proof corrigido (P4) + seção History (P5)
- `src/lib/scan.js` · `src/lib/index-json.js` — `artifacts.entrypoint` (P1)

**Modificados (conteúdo/config):**
- `AGENTS.md` — v0.9.0, 6 comandos, nota do context
- `README.md` · `README.pt.md` · `packages/doctrina-cli/README.md` — stamp v0.9.0 (P3)
- `.doctrina/specs/cli/spec.md` — novos comportamentos documentados, versão 0.21.0
- `.doctrina/templates/doctrina/index.json.template` — entrypoint
- `.doctrina/index.json` + `examples/*/​.doctrina/index.json` — reconstruídos

---

## Rodada 2 — Paridade com concorrentes (descoberta nativa)

Depois do P0–P6, a *maquinaria de rastreabilidade* do Doctrina ficou no topo do
campo (trace + why-com-history + context + honest-gates + index-entrypoint —
nenhum concorrente entrega proveniência determinística nessa profundidade). O
gap real que sobrava era **descoberta**: o agente ainda tinha que *saber* que
deveria chamar `doctrina` na mão. Spec Kit (slash commands) e Kiro (IDE)
expõem o fluxo nativamente; o Doctrina não.

**Ajuste (G-A):** o adapter `claude` agora instala **slash commands nativos** do
Claude Code para o core loop — a mesma UX do `/specify`/`/plan` do Spec Kit:

| Slash command | Roda |
|---------------|------|
| `/doctrina-work <prompt>` | `doctrina work` + conduz a mudança pelos gates |
| `/doctrina-next` | `doctrina next`/`status` e age no item prioritário |
| `/doctrina-context [cap]` | `doctrina context --concat` (pacote de leitura) |
| `/doctrina-status` | painel de saúde |
| `/doctrina-why <cap>` | cadeia de proveniência |

Cada um é um prompt fino que chama a CLI e repassa a saída — a CLI continua
fonte única de verdade (sem nova casa de fatos). Embarca no pacote npm via o
`prepack` (cópia recursiva dos templates).

**Arquivos:** 5 templates novos em
`.doctrina/templates/adapters/claude/.claude/commands/`; spec `templates`
atualizado (v0.8.0) + `product.md` + docs de adapters (EN/PT); 1 teste novo.

**Gaps que continuam (honestos, não fecháveis por código):** amplitude de
agentes (12 vs 30+/100+), exemplos prontos (2 vs dezenas), comunidade e
backing de fornecedor (Microsoft/AWS). São função de idade/recursos, não de
design.

## Rodada 3 — Cursor slash commands + `doctrina constitution`

Os dois follow-ups de código da rodada 2, implementados:

**G-B · Slash commands do Cursor.** O adapter `cursor` agora também instala
`.cursor/commands/doctrina-*.md` (os mesmos 5 do core loop), além da regra
`alwaysApply`. Mesmo padrão do Claude — prompt fino que chama a CLI. Spec
`templates` → v0.9.0; docs de adapters (EN/PT); 1 teste novo.

**G-C · `doctrina constitution` (27º comando).** View read-only que monta as
**regras vigentes** em uma tela — os ADRs aceitos (decisões imutáveis) + os
`## Non-goals` do `product.md`. É o análogo do `constitution.md` do Spec Kit
(o que migrantes esperam), mas **sem nova casa de fatos**: para mudar um
princípio, supersede o ADR; para mudar um non-goal, edite o product.md.
Registrado em `commands.js`/`index.js`, documentado no `cli` spec (v0.22.0) e
nos READMEs/CLI-reference (EN/PT); 1 teste novo.

> Dogfood que funcionou: ao adicionar `constitution` à lista canônica, o
> **gate do P0 acusou** que o `AGENTS.md` raiz não o documentava — exatamente
> o mecanismo construído na rodada 1. Corrigido; AGENTS.md em 148 linhas.

**Arquivos:** `src/commands/constitution.js` (novo) · 5 templates Cursor ·
`src/lib/commands.js`, `src/index.js`, `AGENTS.md`, `AGENTS.md.template` ·
specs `cli`/`templates` · READMEs + `docs/{en,pt}/{adapters,cli-reference,README}.md`
· 2 testes novos.

**Próximos por código (opt-in):** replicar slash commands para os demais
agentes com suporte; `constitution` poderia ganhar um filtro opt-in
(`**Class:** principle`) para catálogos grandes de ADRs.

## Como verificar

```bash
# suíte completa
cd packages/doctrina-cli && node --test          # 173 pass, 0 fail

# gates do CI (na raiz do repo)
node packages/doctrina-cli/src/index.js validate              # exit 0
node packages/doctrina-cli/src/index.js index rebuild --check # exit 0

# evidência dos ajustes
node packages/doctrina-cli/src/index.js status        # stamp current, index in sync
node packages/doctrina-cli/src/index.js context       # specs aparecem no pack
node packages/doctrina-cli/src/index.js why cli        # provas reais + History
node packages/doctrina-cli/src/index.js constitution  # ADRs aceitos + non-goals

# slash commands instalados
node packages/doctrina-cli/src/index.js init --agent claude   # .claude/commands/doctrina-*.md
node packages/doctrina-cli/src/index.js init --agent cursor   # .cursor/commands/doctrina-*.md
```

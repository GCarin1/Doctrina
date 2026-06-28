# Diagrama de fluxo — cada comando

Como toda a superfície do `doctrina` se encaixa. O README mostra o **caminho
principal**; esta página mostra o **fluxo de cada comando**, agrupado pelo
momento em que você o usa. (O CLI é determinístico — esqueletiza, sequencia e
checa; o julgamento semântico fica com o agente/humano, conforme o ADR 0005.)

```mermaid
flowchart TD
    subgraph BOOT["Bootstrap — uma vez por projeto"]
        direction TB
        init["doctrina init<br/>esqueletiza AGENTS.md + .doctrina/"]
        intake["doctrina intake<br/>guarda a intenção + imprime playbook"]
        product["product.md<br/>visão · escopo · anchors [SC]"]
        specnew["doctrina spec new (cap)<br/>spec EARS + Realizes:"]
        init --> intake --> product --> specnew
    end

    subgraph LOOP["Loop de change — uma vez por tarefa (conduzido pelo agente)"]
        direction TB
        work["doctrina work 'prompt'<br/>--from-diff · --chore · --resume"]
        context["doctrina context --concat<br/>pacote de leitura, ordem canônica"]
        delta["spec delta + tasks.md"]
        specset["doctrina spec set (cap)<br/>avança Implementation / bump"]
        analyze["doctrina analyze (id)<br/>pré-checagem da change"]
        cdiff["doctrina change diff (id)<br/>preview dos deltas"]
        capply["doctrina change apply (id)<br/>funde deltas nas specs"]
        carchive["doctrina change archive (id)<br/>recusa trabalho aberto"]
        cabandon["doctrina change abandon (id)<br/>descarta limpo"]
        work --> context --> delta --> specset --> analyze --> cdiff --> capply --> carchive
        delta -. "inviável" .-> cabandon
    end

    subgraph GATES["Gates — verdade-base (determinístico)"]
        direction TB
        validate["doctrina validate (--fix)<br/>schema · estrutura · EARS · drift"]
        verify["doctrina verify (--strict)<br/>testes/build + sign-off manual"]
        coverage["doctrina coverage --strict<br/>critérios ↔ prova"]
        trace["doctrina trace --strict<br/>intenção ↔ capability"]
        review["doctrina review (--diff)<br/>conformidade vs specs/ADRs"]
        clarify["doctrina clarify --all<br/>smell-test de ambiguidade"]
    end

    close["doctrina close (id)<br/>analyze → apply → verify → coverage → trace → archive → validate"]

    subgraph GOV["Decisões & superfície de integração"]
        direction TB
        decnew["doctrina decision new"]
        decaccept["doctrina decision accept"]
        decland["doctrina decision land<br/>registra que entregou"]
        decsuper["doctrina decision supersede"]
        declist["doctrina decision list"]
        decnew --> decaccept --> decland
        decaccept --> decsuper
        contractnew["doctrina contract new"]
        contractcheck["doctrina contract check<br/>portas · env · refs"]
        contractnew --> contractcheck
    end

    subgraph MEM["Memória procedural (skills)"]
        direction TB
        skillsuggest["doctrina skill suggest --write<br/>rascunha de changes fix-shaped"]
        skillnew["doctrina skill new"]
        skillsync["doctrina skill sync"]
        skilllist["doctrina skill list"]
        skillsuggest --> skillnew --> skillsync
    end

    subgraph NAV["Drivers sempre-ativos — você fica passivo"]
        direction TB
        status["doctrina status<br/>onde estou?"]
        next["doctrina next<br/>e agora?"]
        why["doctrina why (cap)<br/>cadeia de proveniência"]
        search["doctrina search"]
        watch["doctrina watch<br/>validate --fix + next ao salvar"]
        metrics["doctrina metrics<br/>adoção derivada do git"]
    end

    subgraph OPS["Manutenção / setup"]
        direction TB
        hooks["doctrina hooks install<br/>pre-commit = validate --fix"]
        indexrebuild["doctrina index rebuild"]
        templates["doctrina templates list/check/update"]
    end

    specnew --> work
    capply --> verify
    capply --> coverage
    capply --> trace
    carchive --> validate
    work -. "uma passada" .-> close
    close --> validate
    validate --> next
    next -. "retoma" .-> work
    LOOP -. "registra decisões" .-> GOV
    LOOP -. "captura lições" .-> MEM
    NAV -. "orienta qualquer tarefa" .-> work
```

## O fluxo de cada comando

**Bootstrap (uma vez).**
- `doctrina init` — esqueletiza `AGENTS.md` e o esqueleto `.doctrina/`.
- `doctrina intake` — guarda a descrição completa do projeto e imprime o playbook
  de bootstrap (preencher `product.md`, derivar capabilities, uma spec EARS cada,
  rodar os gates).
- `doctrina spec new <cap>` (`--bug`) / `spec list` / `spec set <cap>` — cria,
  inventaria e edita specs; `spec set` avança `Implementation:` / bumpa a versão e
  re-sincroniza o índice numa passada.

**Loop de change (por tarefa).**
- `doctrina work "<prompt>"` — esqueletiza uma change e imprime o playbook
  (`--from-diff` faz backfill a partir do código, `--chore` é a faixa sem spec,
  `--resume` reimprime o playbook de uma change aberta).
- `doctrina context [<cap>] --concat` — monta o pacote de leitura na ordem
  canônica. Rode em qualquer tarefa, não só no `work`.
- `doctrina analyze <id>` → `change diff <id>` → `change apply <id>` →
  `change archive <id>` — pré-checa, preview, funde deltas nas specs e arquiva
  (recusando trabalho aberto). `change abandon <id>` descarta.

**Gates (verdade-base).**
- `doctrina validate` (`--fix`) — schema, estrutura, EARS e drift do índice
  (`--fix` cura o drift; o hook de pre-commit roda isto).
- `doctrina verify` (`--strict`, `--signoff`) — o gate real de build/teste, mais
  checagens qualitativas `type: manual` registradas como sign-offs.
- `doctrina coverage --strict` — todo critério de aceite cita prova real.
- `doctrina trace --strict` — a intenção de produto mapeia para uma capability.
- `doctrina review [--diff <ref>]` — conformidade estrutural das suas mudanças vs
  a árvore de specs/ADRs/contratos (o agente se autorevisa antes de entregar).
- `doctrina clarify [--all]` — smell-test de ambiguidade em Markdown.

**Fechamento em uma passada.**
- `doctrina close <id>` — roda analyze → apply → verify → coverage → trace →
  archive → validate numa passada, parando na primeira falha.

**Decisões & contratos.**
- `doctrina decision new → accept → land` (ou `supersede`), `decision list` —
  ADRs imutáveis; `land` registra que uma decisão aceita foi entregue.
- `doctrina contract new` / `contract check` — é dono e verifica a superfície de
  integração (portas, env, specs referenciadas).

**Memória procedural (skills).**
- `doctrina skill suggest [--write]` — mostra (e esqueletiza) skills que valem ser
  capturadas a partir de changes fix-shaped. `skill new` / `sync` / `list`
  completam.

**Drivers sempre-ativos (você fica passivo).**
- `doctrina status` — saúde num olhar. `doctrina next` — a próxima ação
  recomendada. `doctrina why <cap>` — a cadeia de proveniência de uma capability.
  `doctrina search` — encontra artefatos. `doctrina watch` — re-roda
  `validate --fix` + `next` a cada save. `doctrina metrics` — sinais de adoção
  derivados do git.

**Manutenção / setup.**
- `doctrina hooks install` — pre-commit = `validate --fix`. `doctrina index
  rebuild` — regenera o índice a partir da árvore. `doctrina templates
  list|check|update` — inspeciona/atualiza os templates distribuídos.

Veja a **[Referência do CLI](cli-reference.md)** para cada flag e exit code.

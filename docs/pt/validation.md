# Validação

> Tradução da [versão em inglês](../en/validation.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Guia passo-a-passo para rodar o protocolo A/B empírico definido pela
spec de capability `validation`. O ponto é decidir, com dados
honestos de antes/depois, se Doctrina está pagando o próprio custo
no seu projeto.

Este doc é o guia operacional. A
[spec de validation](../../.doctrina/specs/validation/spec.md) é o
contrato.

## Quando rodar

Rode o protocolo pelo menos uma vez após o primeiro mês de uso de
Doctrina. Repita quando:

- Você introduzir uma nova categoria de artefato (uma pasta
  `memory/`, um novo adapter de agente, um processo pesado de
  review de ADR).
- Acontecer mudança de time, de stack, ou mudança significativa de
  escopo.
- Você suspeitar que a cerimônia está excedendo o benefício.

**Não** rode no dia um. Você precisa de prática real com Doctrina
no cohort de tratamento, não do ato de instalar.

## Passo 1 — Baseline

Comece capturando os números do repositório em um comando:

```
doctrina metrics --save
```

Isso grava em `.doctrina/metrics/YYYY-MM-DD.json` a contagem de
commits, taxa de reverts, share de `fix`, arquivos de maior churn
e o proxy de re-edição em 21 dias — tudo derivado só do histórico
git local. Re-execute mensalmente durante o período de tratamento;
`--save` imprime os deltas contra o snapshot anterior.

Depois escolha três a cinco itens de trabalho recentes (features
ou bugs) concluídos **antes** de Doctrina ser introduzido. Se você
não achar cinco, três serve. O cohort deve ser representativo: não
cherry-pick itens fáceis nem difíceis.

Para cada item, registre:

| Campo | Fonte |
|-------|-------|
| Item id | número do PR ou tag da issue |
| Iniciado | primeiro commit na branch |
| Mergeado | commit de merge |
| Lead time | Mergeado − Iniciado (horas ou dias) |
| PR aberto | timestamp de criação do PR |
| PR mergeado | timestamp do merge |
| Tempo de review do PR | PR mergeado − PR aberto |
| Causou incidente? | S/N nos 30 dias após o deploy |
| Requereu hotfix? | S/N |
| Custo | tokens se disponível, senão horas-desenvolvedor |

Um exemplo simples de `baseline.json`:

```json
{
  "cohort": "baseline",
  "items": [
    {
      "id": "PR-142",
      "lead_time_hours": 38,
      "pr_review_hours": 9,
      "caused_incident": false,
      "required_hotfix": false,
      "cost_tokens": null,
      "cost_hours": 6
    }
  ],
  "deployment_frequency_per_week": 4.0,
  "rework_rate": 0.12,
  "change_failure_rate": 0.08,
  "mttr_hours": 2.4
}
```

Commite esse arquivo em algum lugar durável. Uma pasta
`.doctrina/validation/` é um lar natural; uma `docs/validation/`
é outro. Em qualquer caso, vive em git.

## Passo 2 — Tratamento

Rode Doctrina em três a cinco itens novos de **complexidade
comparável** ao cohort baseline. Comparável significa:

- Tamanho de diff similar (dentro de 2× da mediana baseline).
- Número similar de arquivos afetados.
- Churn similar de dependências (nenhum item adiciona um framework
  ou banco que nenhum item baseline adicionou).

Para cada item de tratamento, registre os mesmos campos. Adicione
mais um:

| Campo | Fonte |
|-------|-------|
| Artefatos usados | quais arquivos `.doctrina/` um agente ou humano de fato abriu durante o trabalho |

O campo de artefatos-usados alimenta o Trigger 4 (eliminar
categorias de artefato que ninguém lê).

## Passo 3 — Comparação

Produza um registro que liste cada métrica, valor baseline, valor
de tratamento, delta e o resultado de cada trigger. Uma tabela
Markdown é suficiente; não precisa de dashboard.

| Métrica | Baseline | Tratamento | Δ | Trigger |
|---------|----------|------------|---|---------|
| Lead time | 38h | 31h | −18% | informa trigger 1 |
| Change failure rate | 0.08 | 0.07 | −12% | trigger 1: VERDE |
| Rework rate | 0.12 | 0.09 | −25% | trigger 1: VERDE |
| PR review time | 9h | 16h | +78% | trigger 2: DISPAROU (simplifique) |
| Custo por feature | 6h | 6.5h | +8% | trigger 3: OK |
| Frequência de deploy | 4/sem | 4.5/sem | +13% | par de checagem |
| MTTR | 2.4h | 1.8h | −25% | par de checagem |

O exemplo acima é como uma adoção saudável-mas-imperfeita parece:
rework rate e CFR melhoraram (Trigger 1 diz mantenha), mas o tempo
de review de PR estourou o limite de 50% da Faros (Trigger 2
dispara e você deveria simplificar a superfície de
proposal/review).

## Passo 4 — Aja nos triggers

Para cada trigger disparado, faça algo concreto no próximo change:

- **Trigger 1 disparou (manter/expandir):** adicione Doctrina a
  outro time ou projeto; registre a decisão como ADR.
- **Trigger 2 disparou (simplificar):** identifique o artefato mais
  pesado no loop de review e encolha. Culpados comuns: `design.md`
  inchado, ADRs entupidos de drafts em status proposed,
  AGENTS.md passando do soft cap de 150 linhas.
- **Trigger 3 disparou (cortar um artefato específico):** remova o
  artefato no próximo change; se o aumento de custo foi sua pasta
  `memory/`, isso é o resultado do ETH Zurich no seu repo e o
  corte é obrigatório.
- **Trigger 4 disparou (eliminar uma categoria de artefato):**
  proponha um change que remove a categoria do inventário de
  templates.

## Antipatterns específicos de validação

- **Rodar tratamento sem baseline.** Você então confunde qualquer
  mudança com melhoria. Registre o baseline primeiro.
- **Mudar definições entre cohorts.** "PR review time" deve
  significar a mesma coisa em ambos os registros.
- **Selecionar itens de tratamento não-comparáveis.** Se você
  Doctrina-iza só os itens simples, mede simples-vs-difícil, não
  framework-vs-sem-framework.
- **Tratar triggers disparados como fracasso.** Um Trigger 2
  disparado é um diagnóstico, não veredicto. Simplifique; rerode;
  reavalie.

## O que este protocolo não faz

- Não produz p-values. Tamanhos de amostra são pequenos demais.
- Não compara entre projetos. Cada projeto é seu próprio
  experimento.
- Não roda automaticamente. Não há harness no v0.

Um harness está no roadmap v0.x e será proposto só depois que o
primeiro projeto executar o protocolo à mão.

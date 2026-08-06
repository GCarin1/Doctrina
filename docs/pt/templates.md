# Templates e a cadeia de override

> Tradução da [versão em inglês](../en/templates.md). O inglês é a
> fonte de verdade; este arquivo o segue.

O Doctrina esqueletiza todo artefato a partir de um template. Qual template
ele usa é resolvido por uma **cadeia**, arquivo a arquivo (ADR 0019):

1. `<projeto>/.doctrina/templates/<caminho relativo>` — o do seu projeto.
2. Os templates entregues com o CLI instalado.

O que você não sobrescrever cai no empacotado. Um `.doctrina/templates/`
vazio — o estado que o `doctrina init` cria — se comporta exatamente como
se a cadeia não existisse.

## Vendo o que resolve de onde

```
doctrina templates list
```

Cada entrada é rotulada `bundled` ou `project`, e um arquivo do projeto que
sombreia um empacotado é marcado `overrides bundled`. Os comandos de
scaffold também dizem `(project template)` quando usaram a sua cópia, então
um override nunca é surpresa silenciosa.

## Sobrescrevendo um

Copie o template empacotado para o mesmo caminho relativo dentro do
`.doctrina/templates/` do seu projeto e edite. Para achar o caminho, leia a
coluna da esquerda do `doctrina templates list`.

```
mkdir -p .doctrina/templates
cp "$(npm root)/doctrina-cli/templates/spec.md.template" .doctrina/templates/
$EDITOR .doctrina/templates/spec.md.template
```

O próximo `doctrina spec new <capability>` usa o seu.

## O que é seguro sobrescrever

| Template | Usado por | Notas |
|----------|-----------|-------|
| `spec.md.template` | `spec new` | Mantenha os headers de metadados — o `validate` cobra a forma. |
| `spec-bug.md.template` | `spec new --bug` | Idem. |
| `decision.md.template` | `decision new` | Mantenha os headers em lista (`- **Status:**`). |
| `contract.md.template` | `contract new` | |
| `skill.md.template` | `skill new`, `skill suggest --write` | Mantenha o frontmatter `description:` — o índice o lê. |
| `change/proposal.md.template` | `change new`, `work` | Mantenha `## Why` e `## Verification`; o `analyze` e os gates os leem. |
| `change/tasks.md.template` | `change new`, `work` | Mantenha a forma de checkbox. |
| `change/spec-delta.md.template` | `work --capability` | Mantenha o header `**Operation:**`. |
| `adapters/<nome>/` | `adapter add` | Um diretório aqui é instalável por nome e pode ser um agente que o CLI não empacota. |

**Não sobrescrevível:** o bloco `doctrina:surface` do `AGENTS.md` é gerado
do catálogo de comandos instalado e reescrito no lugar (ADR 0015), e o
`index.json` é escrito a partir do schema, não de um template (auditoria
C5).

## Tokens

Templates usam placeholders `{{TOKEN}}`. O conjunto canônico e o
significado de cada token estão em `.doctrina/templates/README.md` na
árvore do próprio CLI; um template usando token não documentado reprova no
teste de templates.

## O trade-off

Um template sobrescrito fica **fixado**: uma atualização do CLI que melhore
a versão empacotada não alcança a sua cópia. O `doctrina templates list`
marca seus overrides para você revisar após atualizar. Não há checagem de
obsolescência para templates sobrescritos — se você sobrescreve, ele é seu.

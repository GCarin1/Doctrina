# Contribuição

> Tradução da [versão em inglês](../en/contributing.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Obrigado por considerar contribuir. Esta página resume como trabalhar com
o repositório; as regras canônicas e sempre atualizadas vivem em
[CONTRIBUTING.md](https://github.com/GCarin1/Doctrina/blob/main/CONTRIBUTING.md).

## Início rápido

```sh
git clone https://github.com/GCarin1/Doctrina.git
cd Doctrina
node packages/doctrina-cli/src/index.js --help        # smoke test
cd packages/doctrina-cli && npm test                  # roda a suíte
node packages/doctrina-cli/src/index.js validate      # auto-validação
```

Requer Node.js 20.12 ou mais novo. Há zero dependências de runtime e
zero de dev — `npm install` é um no-op.

## Os dois workflows (leia isto primeiro)

Usar o workflow errado é o erro mais comum de quem contribui.

**Workflow A — evoluir o próprio Doctrina** (CLI, templates, specs do
framework, docs shipped): use **Conventional Commits** com commits
diretos. **Não** use `doctrina change new`; o workflow de change é para
projetos que *usam* o Doctrina, e `.doctrina/changes/archive/` neste
repositório deve ficar vazio.

```
feat(cli): add doctrina skill list command
fix(validate): handle missing index gracefully
docs(brownfield): clarify retroactive ADR pattern
```

**Workflow B — projetos que usam o Doctrina**: o ciclo completo
`change new → apply → archive`, documentado em [Workflow](workflow.md).

## Como é um bom PR

- **Spec primeiro.** Se mudar comportamento do CLI, atualize
  `.doctrina/specs/cli/spec.md` no mesmo PR e suba o `Version:`.
- **Testes.** Os testes de integração spawnam o CLI real contra um
  projeto temporário; adicione um por comportamento novo
  (`packages/doctrina-cli/test/`).
- **Gates verdes.** `npm test`, `doctrina validate`,
  `doctrina index rebuild --check` e `doctrina clarify --all` rodam no
  CI em três sistemas operacionais — rode localmente antes.
- **Docs bilíngues.** Docs de usuário mudam em `docs/en/` **e**
  `docs/pt/`. EN é a fonte; PT é a tradução, nunca o contrário.

## Boas primeiras contribuições

- Um adapter de agente novo (menos de 30 linhas — veja
  [Adapters](adapters.md) e os existentes como referência).
- Correção de tradução ou lacuna de paridade entre `docs/en/` e
  `docs/pt/`.
- Um teste de integração de caso-falha para um edge que você encontrou
  em uso real.

## Reportando problemas

Use os [templates de issue](https://github.com/GCarin1/Doctrina/issues/new/choose).
Para assuntos de segurança, siga o
[SECURITY.md](https://github.com/GCarin1/Doctrina/blob/main/SECURITY.md)
em vez de abrir issue pública.

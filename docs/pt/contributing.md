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

## Um workflow só (leia isto primeiro)

Este repositório constrói o Doctrina e o usa em si mesmo (ADR 0014): uma
mudança no framework passa pelo mesmo ciclo de uma mudança em qualquer
projeto que o adotou, documentado em [Workflow](workflow.md).

```sh
doctrina prime                          # gates, regras, trabalho aberto
doctrina work "<o que você quer mudar>"
# planeje proposal, tasks e delta de spec; implemente com um teste
doctrina change check <id>              # tudo o que o close recusaria
doctrina close <id>                     # a sequência de fechamento inteira
```

Uma change, um commit, com prefixo de Conventional Commits e o id da
change no título (`fix: <resumo> — Change 0183`). As changes arquivadas
em `.doctrina/changes/archive/` são o histórico do projeto.

## Como é um bom PR

- **Spec primeiro.** Se mudar comportamento do CLI, o delta de spec da
  change carrega o requisito novo, o critério e o `bump-version`; o close
  faz o merge na spec.
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

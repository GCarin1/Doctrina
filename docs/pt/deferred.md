# Adiado em v0.1.0

> Tradução da [versão em inglês](../en/deferred.md). O inglês é a
> fonte de verdade; este arquivo o segue.

Registro de features que Doctrina considerou e escolheu não
shippar em v0.1.0. Cada item nomeia um gatilho que justificaria
revisitar. A lista existe para que contribuidores futuros e
usuários externos consigam distinguir "não fizemos X" de
"consideramos X e estas são as razões pelas quais não fizemos".

Este doc é um registro de escolhas, não um roadmap. Itens de fato
planejados para o próximo minor vivem na seção Unreleased do
CHANGELOG.

## Logo e identidade visual

**Status:** resolvido — marca escolhida.

**Desfecho:** este registro definiu "uma landing page hospedada é
construída" como gatilho, e o site de documentação (GitHub Pages,
servido de `docs/`) é essa landing page. O dono escolheu o
monograma — `{D}`, a doutrina dentro das chaves do desenvolvedor —
como marca do projeto. Ele é um SVG puro em
`docs/assets/logo-monogram.svg`, usado pelo shell do site, pelas
landing pages e pelo README.

## Telemetria e analytics

**Status:** rejeitado, não adiado.

**Por quê:** SECURITY.md compromete zero telemetria, zero
analytics, zero network calls como policy publicada. Adicionar
qualquer desses em versão futura seria reversão de policy que
requer um ADR novo e ciclo de deprecação.

**Gatilho para revisitar:** nenhum planejado. Se o projeto algum
dia shippar telemetria, a barra é um ADR superseding a postura
silent-no-telemetry, um opt-in (nunca opt-out) flag, um schema
documentado de dados e policy documentada de retenção.

## Traduções além de EN + PT

**Status:** adiado indefinidamente.

**Por quê:** Cada idioma adicional adiciona 13 docs (o inventário
EN atual) que devem ser mantidos em sync. PT foi adicionado
porque a língua de trabalho primária do mantenedor é português;
mais idiomas precisam de um contribuidor disposto a possuir o
trabalho contínuo de paridade.

**Gatilho para revisitar:** um contribuidor se compromete a
manter um idioma específico indefinidamente, ou os dados do
protocolo A/B de validação mostram pattern de adoção sustentado
numa região-idioma que justifica uma nova tradução.

## Plugins e extensões de IDE

**Status:** fora de escopo.

**Por quê:** O ecosystem AGENTS.md e os doze agentes suportados
(sete com adapters thin-pointer — Claude Code, Cursor, Copilot,
Gemini CLI, Aider, Windsurf, Continue — e cinco AGENTS.md-native:
Codex CLI, Amp, Devin, Factory, Jules) cobrem os caminhos
majoritários de integração. Uma extensão de IDE específica do Doctrina seria um
produto separado com seu próprio marketplace, pipeline de build
e ciclo de manutenção — além do que um framework de CLI deveria
shippar.

**Gatilho para revisitar:** nenhum. Doctrina é a camada
file-substrate; integração com IDE pertence aos vendors de
agente e editor.

## Mecanismo de auto-update para templates

**Status:** levantado — `doctrina templates update` shipped, com a
barra exata que este registro definiu: preview é o default (o
comando não escreve nada e sai 1 enquanto há updates pendentes),
`--write` é o opt-in, e as mudanças são só-aditivas (seções stub
anexadas, campos faltantes do index adicionados; conteúdo
existente nunca é reescrito ou removido).

**O que fica fora:** updates silenciosos ou automáticos. O comando
roda só quando invocado, e o pattern de conventions-repo
(documentado em `context-engineering.md`) segue como caminho
recomendado para propagar regras entre projetos.

## Profiling de performance além dos benchmarks sintéticos

**Status:** adiado até cargas reais de adoção existirem.

**Por quê:** O script de bench em `scripts/bench.js` mostra
números de ordem de grandeza. Profiling mais profundo (CPU
por-função, padrões de alocação, comportamento cold-cache em
filesystems específicos) requer cargas reais de projetos reais,
o que v0.1.0 ainda não tem.

**Gatilho para revisitar:** um adopter real reporta latência que
o script de bench não prevê, ou o protocolo A/B de validação
traz à tona validate como bottleneck.

## Outros itens adiados ou fora de escopo

- **Comando de quality gate `/checklist`.** A seção
  `## Acceptance criteria` do template de spec cobre o caso de
  uso. Gatilho para revisitar: alguém propõe um shape de
  checklist distinto de critérios de aceitação.
- **Documento de constitution centralizado.** ADRs aceitos
  (`0001`, `0003`, `0004`) mais a seção de princípios de design
  do README codificam o mesmo conteúdo. Gatilho: um migrante do
  Spec Kit reporta que a falta de `constitution.md` confunde a
  migração; o guia de migração já mapeia esse caso.

## Smells de clarify aceitos

`doctrina clarify` sinaliza weasel words e quantificadores
vagos. Rodando contra todo artefato da árvore, duas categorias
aceitáveis aparecem que o repositório mantém como estão:

1. **Três smells no `ADR 0001`** (a decisão de adoção do
   AGENTS.md). ADRs são imutáveis pela própria disciplina do
   framework; editar o corpo de um ADR aceito violaria a regra
   que o framework prega.

Citações de pesquisa são um não-exemplo: `context-engineering.md`
(o achado de 80% da Anthropic no BrowseComp) e `multi-agent.md`
(a figura de 15× de custo de tokens em multi-agente) citam a
fonte diretamente e são redigidas sem termos weasel, então o
`clarify` as aprova por mérito, não por exceção.

O comando clarify é projetado para documentos vivos (specs,
docs, change proposals). Um contribuidor futuro rodando deve
esperar zero hits em texto vivo e exatamente três hits no
`ADR 0001`.

## Como propor a remoção de um adiamento

Abra um `doctrina change new` cujo proposal nomeie o item deste
registro, o gatilho que disparou e o escopo da remoção. A pasta
de change ship o trabalho; este doc é atualizado para registrar o
novo status.

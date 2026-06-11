# LLMs locais e modelos não-Anthropic

> Tradução da [versão em inglês](../en/local-llms.md). O inglês é
> a fonte de verdade; este arquivo o segue.

Doctrina é agent-agnostic. O framework em si é só arquivos
Markdown e um CLI Node; nada em Doctrina faz uma única chamada
de API LLM. O agent runtime — o que lê `AGENTS.md` e digita no
seu editor — é um componente separado que você escolhe.

Este doc explica como conectar Doctrina a LLMs locais (LLaMA,
Mistral, Qwen, DeepSeek e similares) e a endpoints cloud
não-Anthropic (Groq, Together, Fireworks, OpenRouter, etc.).

## Modelo mental

```
+---------------------+    lê       +-------------------+
|   Agent runtime     |  -------->  |   AGENTS.md +     |
|  (Aider, Continue,  |             |   árvore          |
|   Cursor, Copilot,  |             |   .doctrina/      |
|   Claude Code, ...) |             |   (Doctrina)      |
+---------------------+             +-------------------+
         |
         | conversa via API com
         v
+---------------------+
|   O LLM             |
|  (Claude, GPT,      |
|   LLaMA, Mistral,   |
|   Qwen, DeepSeek)   |
+---------------------+
```

Duas camadas, duas escolhas:

- **Qual agent runtime?** Determina onde AGENTS.md é carregado
  e como o workflow dirige `doctrina change`, `doctrina
  validate`, etc.
- **Qual LLM?** Determina o cérebro. A maioria dos runtimes
  suporta vários LLMs via configuração.

Doctrina suporta doze runtimes (`init --agent <name>`): sete
instalam adapters thin-pointer e cinco leem `AGENTS.md`
nativamente. O LLM por trás de cada runtime é configurado
separadamente.

## Compatibilidade runtime × LLM

| Runtime | Adapter Doctrina | LLMs locais | Cloud OpenAI-compatible | Cloud Anthropic |
|---------|------------------|-------------|--------------------------|-----------------|
| Aider | `--agent aider` (CONVENTIONS.md) | ✅ Ollama, LM Studio, vLLM | ✅ todos | ✅ Claude |
| Continue.dev | `--agent continue` | ✅ Ollama, LM Studio | ✅ todos | ✅ Claude |
| Cursor (endpoint custom) | `--agent cursor` | ✅ via LiteLLM proxy | ✅ todos | ✅ Claude |
| OpenAI Codex CLI | `--agent codex` (AGENTS.md nativo) | ⚠️ depende do build | ✅ OpenAI + compatíveis | — |
| GitHub Copilot | `--agent copilot` | — | — | — |
| Gemini CLI | `--agent gemini` | — | — | — |
| Windsurf | `--agent windsurf` | ⚠️ depende do plano | ✅ via settings | ✅ Claude |
| Claude Code | `--agent claude` | — | — | ✅ Só Claude |

Quando a coluna mostra ✅ o runtime pode ser apontado para
aquela categoria de LLM via configuração própria. Quando mostra
— aquela combinação não é suportada pelo runtime; o adapter
Doctrina ainda instala mas o runtime não vai usar aquele LLM.

## Três receitas concretas de setup

### Receita A — LLaMA 3 via Ollama + Aider

Tudo fica na sua máquina. Bom para projetos com restrição de
compliance.

```sh
# 1. Instalar Ollama e baixar o modelo
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:70b           # ou llama3.1:8b para hardware menor

# 2. Instalar Aider
pip install aider-chat

# 3. No seu projeto: esqueletizar Doctrina + adapter Aider
npx doctrina-cli init --project-name "Meu Projeto" --agent aider
# Cria AGENTS.md + .doctrina/ + CONVENTIONS.md (pointer Aider para AGENTS.md)

# 4. Rodar Aider contra o modelo local
aider --model ollama/llama3.1:70b
# Aider lê CONVENTIONS.md, segue o pointer para AGENTS.md,
# e usa a árvore .doctrina/ como contexto.
```

### Receita B — DeepSeek-V3 via API + Continue.dev (VS Code)

Modelo cloud barato, integrado à IDE.

```sh
# 1. Instalar extensão Continue no VS Code via marketplace.

# 2. No seu projeto:
npx doctrina-cli init --project-name "Meu Projeto" --agent continue
# Cria .continue/rules/00-doctrina.md como pointer para AGENTS.md.

# 3. Configurar Continue para usar DeepSeek
#    (Continue cria ~/.continue/config.json na primeira execução):
```

```json
{
  "models": [
    {
      "title": "DeepSeek V3",
      "provider": "deepseek",
      "model": "deepseek-chat",
      "apiKey": "sk-..."
    }
  ]
}
```

```sh
# 4. Abra Continue dentro do VS Code. Ele carrega a regra,
#    segue o pointer para AGENTS.md e lê o resto de .doctrina/.
```

### Receita C — Universal: qualquer modelo via LiteLLM proxy

Para quando você quer manter uma config única e trocar LLMs
reiniciando um único processo. Funciona para Cursor, Aider,
Continue, Codex CLI e qualquer outro cliente OpenAI-compatible.

```sh
# 1. Instalar e rodar LiteLLM proxy
pip install 'litellm[proxy]'
litellm --model ollama/qwen2.5-coder:32b --port 4000
# Agora há um endpoint OpenAI-compatible em http://localhost:4000

# 2. Inicializar Doctrina com o adapter do cliente que você usa
npx doctrina-cli init --agent cursor          # ou aider, ou continue

# 3. Apontar o cliente para o proxy
#    Cursor:    Settings -> Models -> OpenAI API Key -> sobrescrever
#               base URL para http://localhost:4000
#    Aider:     aider --openai-api-base http://localhost:4000 \
#                     --openai-api-key dummy
#    Continue:  config.json provider "openai", apiBase
#               "http://localhost:4000"

# 4. O runtime agora conversa com o LLM local via LiteLLM e lê
#    os arquivos do Doctrina exatamente como faria com cloud LLM.
```

## Caveats honestos

Reais e vale conhecer antes de você se comprometer com um setup.

- **Modelos locais menores seguem regras menos confiavelmente.**
  Um modelo 7B ou 13B frequentemente passa o olho no AGENTS.md
  em vez de obedecer. Densidade e size caps do Doctrina (150
  linhas para AGENTS.md, 400 para specs) ajudam, mas o gap de
  qualidade vs Claude / GPT-4 permanece. Planeje revisar o
  proposal com cuidado antes de aprovar.
- **Tamanho de context window importa.** Modelos com janela
  4K-8K acabam o espaço quando `.doctrina/` cresce. A ordem de
  leitura do Doctrina (AGENTS.md, depois product.md, depois a
  spec relevante) coloca o contexto mais importante primeiro,
  mas janelas muito pequenas ainda truncam. Prefira modelos com
  pelo menos 32K context para uso significativo do Doctrina.
- **Suporte a tool-call varia.** Alguns modelos locais não
  conseguem chamar funções, o que significa que o runtime pode
  escrever um `proposal.md` para você mas não roda
  `doctrina change apply` sozinho. Você roda os comandos CLI à
  mão nesses casos. O framework ainda funciona; o loop tem um
  passo extra.
- **Qualidade de draft de spec cai em modelos menores.** Seções
  EARS sofrem primeiro. O comando `doctrina clarify` pega muitos
  dos smells resultantes; rodar depois de cada draft é mais
  importante quando o LLM é pequeno.
- **Compatibilidade do OpenAI Codex CLI com endpoints locais
  varia por build.** Versões recentes aceitam base URL custom;
  versões antigas não. Teste com `--help` antes de se
  comprometer.

## Escolhendo um runtime para LLMs não-Anthropic

Uma heurística curta, não um ranking:

- Quer tudo no terminal e zero acoplamento com IDE? **Aider.**
- Já está em VS Code ou JetBrains e quer completions mais chat?
  **Continue.dev.**
- Já paga Cursor e só quer um modelo diferente atrás dele?
  **Cursor com endpoint custom** (e LiteLLM se o modelo for
  local).
- Já no Copilot? **GitHub Copilot custom instructions** — o
  adapter `--agent copilot` escreve
  `.github/copilot-instructions.md` e o modelo é o que o seu
  plano Copilot oferece.

## Material relacionado

- [Adapters](adapters.md) — os doze agentes suportados e como
  cada um roteia para AGENTS.md.
- [Engenharia de contexto](context-engineering.md) — por que os
  size caps que ajudam modelos pequenos importam para todos os
  modelos.
- [Comparação](comparison.md) — posicionamento do Doctrina vs
  outros frameworks SDD.

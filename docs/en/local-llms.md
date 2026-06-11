# Local LLMs and non-Anthropic models

Doctrina is agent-agnostic. The framework itself is just Markdown
files and a Node CLI; nothing in Doctrina makes a single LLM API
call. The agent runtime — whatever reads `AGENTS.md` and types
into your editor — is a separate component that you choose.

This doc explains how to wire Doctrina to local LLMs (LLaMA,
Mistral, Qwen, DeepSeek and friends) and to non-Anthropic cloud
endpoints (Groq, Together, Fireworks, OpenRouter, etc.).

## Mental model

```
+---------------------+    reads    +-------------------+
|   Agent runtime     |  --------> |   AGENTS.md +     |
|  (Aider, Continue,  |             |   .doctrina/      |
|   Cursor, Copilot,  |             |   tree            |
|   Claude Code, ...) |             |   (Doctrina)      |
+---------------------+             +-------------------+
         |
         | talks via API to
         v
+---------------------+
|   The LLM           |
|  (Claude, GPT,      |
|   LLaMA, Mistral,   |
|   Qwen, DeepSeek)   |
+---------------------+
```

Two layers, two choices:

- **Which agent runtime?** Determines where AGENTS.md gets
  loaded from and how the workflow drives `doctrina change`,
  `doctrina validate`, etc.
- **Which LLM?** Determines the brain. Most runtimes accept
  dozens of LLMs through configuration.

Doctrina supports twelve runtimes (`init --agent <name>`): seven
install thin pointer adapters and five read `AGENTS.md` natively.
The LLM behind each runtime is configured separately.

## Runtime × LLM compatibility

| Runtime | Doctrina adapter | Local LLMs | OpenAI-compatible cloud | Anthropic cloud |
|---------|------------------|------------|-------------------------|-----------------|
| Aider | `--agent aider` (CONVENTIONS.md) | ✅ Ollama, LM Studio, vLLM | ✅ all | ✅ Claude |
| Continue.dev | `--agent continue` | ✅ Ollama, LM Studio | ✅ all | ✅ Claude |
| Cursor (custom endpoint) | `--agent cursor` | ✅ via LiteLLM proxy | ✅ all | ✅ Claude |
| OpenAI Codex CLI | `--agent codex` (native AGENTS.md) | ⚠️ depends on build | ✅ OpenAI + compatibles | — |
| GitHub Copilot | `--agent copilot` | — | — | — |
| Gemini CLI | `--agent gemini` | — | — | — |
| Windsurf | `--agent windsurf` | ⚠️ depends on plan | ✅ via settings | ✅ Claude |
| Claude Code | `--agent claude` | — | — | ✅ Claude only |

When a column shows ✅ the runtime can be pointed at that LLM
category through its own configuration. When it shows — that
combination is not supported by the runtime; the Doctrina
adapter still installs cleanly but the runtime will not use the
target LLM.

## Three concrete setup recipes

### Recipe A — LLaMA 3 via Ollama + Aider

Everything stays on your machine. Good for compliance-sensitive
projects.

```sh
# 1. Install Ollama and pull the model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:70b           # or llama3.1:8b for lighter hardware

# 2. Install Aider
pip install aider-chat

# 3. In your project: scaffold Doctrina + Aider adapter
npx doctrina-cli init --project-name "My Project" --agent aider
# Creates AGENTS.md + .doctrina/ + CONVENTIONS.md (Aider pointer to AGENTS.md)

# 4. Run Aider against the local model
aider --model ollama/llama3.1:70b
# Aider reads CONVENTIONS.md, follows the pointer into AGENTS.md,
# and uses the .doctrina/ tree as context.
```

### Recipe B — DeepSeek-V3 via API + Continue.dev (VS Code)

Cheap cloud model, IDE-integrated.

```sh
# 1. Install the Continue extension in VS Code from the marketplace.

# 2. In your project:
npx doctrina-cli init --project-name "My Project" --agent continue
# Creates .continue/rules/00-doctrina.md as a pointer to AGENTS.md.

# 3. Configure Continue to use DeepSeek
#    (Continue creates ~/.continue/config.json on first run):
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
# 4. Open Continue inside VS Code. It loads the rule, follows the
#    pointer to AGENTS.md, and reads the rest of .doctrina/.
```

### Recipe C — Universal: any model via LiteLLM proxy

For when you want to keep a single config and swap LLMs by
restarting one process. Works for Cursor, Aider, Continue,
Codex CLI, and any other OpenAI-compatible client.

```sh
# 1. Install and run LiteLLM proxy
pip install 'litellm[proxy]'
litellm --model ollama/qwen2.5-coder:32b --port 4000
# Now there is an OpenAI-compatible endpoint at http://localhost:4000

# 2. Initialise Doctrina with the adapter for the client you use
npx doctrina-cli init --agent cursor          # or aider, or continue

# 3. Point the client at the proxy
#    Cursor:      Settings -> Models -> OpenAI API Key -> override base URL
#                 to http://localhost:4000
#    Aider:       aider --openai-api-base http://localhost:4000 \
#                       --openai-api-key dummy
#    Continue:    config.json provider "openai", apiBase
#                 "http://localhost:4000"

# 4. The runtime now talks to the local LLM through LiteLLM and
#    reads Doctrina's files exactly as it would with any cloud LLM.
```

## Honest caveats

These are real and worth knowing before you commit a setup.

- **Smaller local models follow rules less reliably.** A 7B or
  13B model often skims AGENTS.md instead of obeying it.
  Doctrina's density and size caps (150 lines for AGENTS.md, 400
  for specs) help, but the quality gap versus Claude / GPT-4
  remains. Plan to review the proposal carefully before approval.
- **Context window matters.** Models with a 4K-8K window run out
  of room once `.doctrina/` grows. Doctrina's read order
  (AGENTS.md, then product.md, then the relevant spec) puts the
  most important context first, but very small windows still
  truncate. Prefer models with at least 32K context for
  meaningful Doctrina use.
- **Tool-call support varies.** Local models without
  function-calling cannot call
  functions, which means the runtime can write a `proposal.md`
  for you but cannot run `doctrina change apply` by itself. You
  run the CLI commands by hand in those cases. The framework
  still works; the loop has one extra step.
- **Spec drafting quality drops on smaller models.** EARS
  sections suffer first. The `doctrina clarify` command catches
  a lot of the resulting smells; running it after every spec
  draft is more important when the LLM is small.
- **OpenAI Codex CLI compatibility with local endpoints varies
  by build.** Recent versions accept a custom base URL; older
  ones do not. Test with `--help` before committing.

## Choosing a runtime for non-Anthropic LLMs

A short heuristic, not a ranking:

- Want everything terminal-based and zero IDE coupling? **Aider.**
- Already in VS Code or JetBrains and want completions plus chat?
  **Continue.dev.**
- Already paying for Cursor and just want a different model
  behind it? **Cursor with custom endpoint** (and LiteLLM if the
  model is local).
- Already on Copilot? **GitHub Copilot custom instructions** —
  the `--agent copilot` adapter writes
  `.github/copilot-instructions.md` and the model is whatever
  your Copilot plan provides.

## Related material

- [Adapters](adapters.md) — the twelve supported agents and
  how each routes to AGENTS.md.
- [Context engineering](context-engineering.md) — why the size
  caps that help small models matter for all models.
- [Comparison](comparison.md) — Doctrina's positioning vs other
  SDD frameworks.

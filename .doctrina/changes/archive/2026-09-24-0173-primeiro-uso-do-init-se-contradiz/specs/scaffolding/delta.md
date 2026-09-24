# Spec Delta — capability: scaffolding

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/scaffolding/spec.md`

---

O primeiro uso dá uma instrução só, e é a mesma que o `next` e o AGENTS.md dão.

```ops
append-requirement event: When `doctrina init` runs on an interactive terminal with neither a description nor an intake supplied, the system shall ask one question — describe the project — store the answer as the intake with the description derived from it, and close by telling the person to have their agent read AGENTS.md and run `doctrina next`, rather than printing the agent's playbook or asking for the same description again later.
append-requirement event: When `doctrina init` finishes with a description but no intake, the system shall name the step `doctrina next` names — `doctrina intake --text` with the whole description, or `doctrina work --from-diff` for an existing codebase — and never tell the person to edit AGENTS.md or product.md by hand.
append-criterion [verified] After a description typed at the terminal the closing line sends the person to their agent, without an intake `init` and `next` name the same command, and an intake given as a flag still prints the agent's playbook — verified by `packages/doctrina-cli/test/o-primeiro-uso-tem-uma-instrucao.test.js`.
bump-version minor
```

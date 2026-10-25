# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

```ops
set-header Source: `packages/doctrina-cli/src/commands/{coverage,trace,review,verify,analyze,clarify,close,doctor,ci}.js`, `packages/doctrina-cli/src/lib/{gates,coverage-model,trace-model,analysis,clarity,reproducibility,signoff,runtime,docs-impact,verify-cache}.js`, `scripts/bench.js`, `scripts/e2e-packed.mjs`, `action.yml`
append-requirement event: When `verify --reuse` runs — as `close` runs it — and the last run in which every check passed started from a byte-identical fingerprint of the code (the working tree minus `.doctrina/`, plus the verify configuration and the CLI version), the system shall skip the checks and say which run it reused; any difference shall run every check, and a plain `verify` shall always run them.
append-criterion [verified] After a green `verify`, `verify --reuse` runs no check while a plain `verify` runs again; an edited file, a new file or a red run makes `--reuse` run everything; `.doctrina/` and ignored files do not move the fingerprint; and `close` passes `--reuse` — verified by `packages/doctrina-cli/test/o-verify-verde-nao-roda-duas-vezes.test.js`.
bump-version minor
```

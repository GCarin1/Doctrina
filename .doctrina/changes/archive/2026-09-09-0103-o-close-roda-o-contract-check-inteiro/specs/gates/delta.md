# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

O passo `runtime` do `close` e o `contract check` leem uma só coleção de
achados, estruturais e de runtime, para que o que um reprova o outro
reprove.

```ops
append-requirement ubiquitous: The system shall collect a contract's structural findings — a port claimed by two services (CT01), a declared environment variable absent from `.env.example` (CT02), a reference to a capability spec that does not exist (CT03) — in the same collection as the runtime findings RT01-RT05, so that `contract check`, the close's runtime step, `validate --runtime` and `doctor` render one verdict.
append-requirement unwanted: The system shall not close a change while a contract carries a structural error that `contract check` reports, and shall not report a contract with a structural error as "unchecked" because it declares no Wiring or Selectors rows.
append-criterion [verified] A contract with a duplicated port and a reference to a missing spec fails `contract check`, stops the close at the runtime step and fails the doctor's runtime row with the same CT codes, while a contract with no defect and no rows stays unchecked at exit 0 — verified by `packages/doctrina-cli/test/the-close-runs-the-whole-contract-check.test.js`.
bump-version minor
```

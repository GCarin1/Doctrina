# Spec Delta — capability: cli

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/cli/spec.md`

---

Audit item C1, data loss. Adding an adapter to an existing project was
only reachable through `init --agent <name> --force`, which regenerated
AGENTS.md and product.md from blank templates and destroyed authored
content at exit 0. Adapters become their own additive command, and
scaffolding loses the power to overwrite what someone wrote (ADR 0016).

```ops
bump-version minor
set-header Last updated: 2026-08-06
append-requirement event: When `doctrina adapter add <name>` runs, the system shall write only that adapter's own files and shall leave `AGENTS.md`, `.doctrina/product.md`, and every other project artifact byte-identical.
append-requirement event: When `doctrina adapter list` runs, the system shall report each adapter as installed, available, or native, where native means the agent reads `AGENTS.md` directly and the adapter installs no file.
append-requirement event: When `doctrina adapter remove <name>` runs, the system shall delete only files that adapter created, and shall keep any file edited since install unless `--force` is given.
append-requirement event: When `doctrina init --force` would overwrite an `AGENTS.md` or `.doctrina/product.md` that carries authored content, the system shall refuse, name the files it declined to touch, point at `doctrina adapter add`, and write nothing; `--overwrite-content` shall be required to discard that content.
append-requirement unwanted: The system shall not treat a token substitution as authorship when deciding whether a scaffolded file is pristine; comparison is by template shape, excluding the volatile date line and the CLI-owned surface block.
append-criterion [verified] `adapter add` leaves `AGENTS.md` and `.doctrina/product.md` byte-identical, and an add/remove round trip returns the tree to its prior state — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] `init --agent <name> --force` on a project with authored content exits non-zero, names the files, and writes nothing; `--overwrite-content` still allows the discard — verified by `packages/doctrina-cli/test/integration.test.js`.
append-criterion [verified] `adapter list` distinguishes installed, available, and native, and a native adapter installs nothing — verified by `packages/doctrina-cli/test/integration.test.js`.
```

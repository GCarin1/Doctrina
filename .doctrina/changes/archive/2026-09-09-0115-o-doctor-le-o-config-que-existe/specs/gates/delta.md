# Spec Delta — capability: gates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/gates/spec.md`

---

<!-- delta body below -->

O `doctor` reporta o arquivo de configuração que existe, não só os
valores que sobraram dele.

```ops
append-requirement event: When `.doctrina/config.json` cannot be loaded or carries a value that is rejected, the system shall report the `config` row of `doctor` as failing, naming the error, rather than as the defaults it fell back to.
append-requirement event: When `.doctrina/config.json` carries a key the CLI does not know, the system shall report a warning in `validate` and in `doctor` naming the key and the keys it accepts.
append-criterion [verified] An invalid config fails the doctor's config row naming the error, a misspelled key draws a warning from validate and from doctor naming the valid keys, and a valid config is silent — verified by `packages/doctrina-cli/test/the-doctor-reads-the-config-that-exists.test.js`.
bump-version minor
```

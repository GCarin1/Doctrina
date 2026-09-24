# Spec Delta — capability: templates

**Operation:** MODIFIED
**Target spec on apply:** `.doctrina/specs/templates/spec.md`

---

O `upgrade` cobre o `templates check` e o `templates update`.

```ops
append-requirement event: When `doctrina upgrade` runs, the system shall report, in its scaffold-shape step, every finding `templates check` reports — the ones the additive update repairs as pending steps, and each one no command repairs (a hub pointer that lost AGENTS.md, a broken playbook) with its named fix — and shall exit with the gate class while any is left, with or without `--write`, because "nothing to upgrade" over a project the check fails is a green light on red.
append-requirement event: When the deprecated `doctrina templates check` or `doctrina templates update` runs, the system shall behave as before and name `doctrina upgrade` (or `doctrina upgrade --write`) on stderr.
append-criterion [verified] Over a project with one repairable and one manual finding, the upgrade preview reports every finding the check reported and exits 1, `upgrade --write` writes what `templates update --write` wrote and stays red until the named fix is run, and both templates operations warn naming the upgrade — verified by `packages/doctrina-cli/test/o-upgrade-cobre-o-templates.test.js`.
bump-version minor
```

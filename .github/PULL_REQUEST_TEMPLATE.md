<!--
This template covers PRs to the Doctrina framework repository
itself. Framework evolution uses Conventional Commits, not
`doctrina change new`. See CONTRIBUTING.md, section
"Two workflows — pick the right one".
-->

## Summary

<!--
One or two sentences. What changes? Use Conventional Commits
prefix in the PR title (feat / fix / docs / refactor / chore /
test / build / ci).
-->

## Type of change

<!-- Check one or more. -->

- [ ] `feat` — new feature or capability
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `refactor` — code change without behaviour change
- [ ] `chore` — tooling, build, or housekeeping
- [ ] `test` — test-only change
- [ ] `ci` — CI/release workflow change

## Checklist

- [ ] Commits follow Conventional Commits (`type(scope): summary`).
- [ ] No change folder was created under `.doctrina/changes/`
      (framework evolution lives in git history, not artifacts).
- [ ] `cd packages/doctrina-cli && npm test` is green.
- [ ] `node packages/doctrina-cli/src/index.js validate` exits 0.
- [ ] If a doc changed: EN and PT updated in the same PR.
- [ ] If a new CLI command landed: at least one integration
      test was added and `docs/en/cli-reference.md` (+ PT) was
      updated.
- [ ] No new runtime dependency in
      `packages/doctrina-cli/package.json` (or an accompanying
      ADR justifies one).

## Notes for reviewers

<!--
Anything reviewers should look at first. Honest caveats welcome.
-->

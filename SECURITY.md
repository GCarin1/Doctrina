# Security policy

## Supported versions

| Version  | Supported |
|----------|-----------|
| `0.16.x` | yes       |
| `< 0.16` | no        |

Doctrina is pre-1.0 and ships from a single line of development: the
current minor is the supported one, and a fix lands in the next minor
rather than being backported. Versions below `0.1.0` do not exist.

## Posture and commitments

The following are properties Doctrina maintains by design. They
are stated as policy so that any deviation is a bug worth
reporting.

- **Zero runtime dependencies.** The CLI imports only Node.js
  standard library modules. The `dependencies` field of every
  published `package.json` is absent or empty. Any PR that adds
  a runtime dependency requires an ADR and a separate review
  pass.
- **No network calls.** The CLI does not make HTTP requests, does
  not resolve DNS, does not contact any remote service at run
  time. Templates are loaded from local disk only.
- **No telemetry, no analytics, no fingerprinting.** Doctrina
  does not collect usage, errors, install counts, machine
  identifiers, or any other signal. No metric leaves your
  machine.
- **Filesystem boundary.** The CLI writes only inside the current
  working directory and (for `hooks install`) inside
  `.git/hooks/`. It does not modify files outside the project
  tree.
- **Subprocesses are `git`, or commands the project declared.**
  The CLI spawns exactly three kinds of process, and no others:
  read-only `git` queries (`cat-file`, `diff`, `log`,
  `ls-files`, `merge-base`, `rev-parse`) for the commands that
  read history, passed as an argument array and never through a
  shell; the `checks[].run` commands of `.doctrina/verify.json`,
  run by `doctrina verify`; and that file's `evidence_runner`,
  run by `doctrina coverage --run`. `doctrina hooks install`
  writes `.git/hooks/pre-commit`, which git later runs.
  
## The trust boundary: a project's own files

`.doctrina/verify.json` is executable configuration, in the same
sense as the `scripts` block of a `package.json`. Whoever can
write that file decides what `doctrina verify` and `doctrina
coverage --run` execute on the machine that runs them.

That is the contract those two commands exist to serve — a
project declares its build gate and the CLI runs it — but it has
a consequence worth stating plainly: **running `doctrina verify`
inside a repository you do not trust runs commands that
repository chose.** Read `.doctrina/verify.json` before running
either command on code you did not write, exactly as you would
read a `package.json` before `npm test`.

Every other command — `validate`, `status`, `context`, `close`,
the whole read and scaffold surface — reads and writes files and
queries `git`. None of them executes a project-declared command.

## What counts as a security issue

- A path the CLI writes outside the project working directory.
- A path the CLI reads outside the project working directory or
  the package's installed templates.
- An accidental network call.
- Information leakage in error messages (paths, file contents,
  user identifiers).
- Any path by which a malicious template, spec, or change folder
  causes the CLI to execute code. Only the three sources named
  above may reach a subprocess; a crafted artifact that gets a
  command run through any other command is a bug worth reporting.
- A `verify.json` command escaping the checks it declares — a
  `cwd` outside the project, or an argument the CLI interpolates
  into a shell string from anywhere but that file.

The following are **not** security issues for Doctrina:

- `doctrina verify` or `doctrina coverage --run` executing what
  `.doctrina/verify.json` declares. That is what those commands
  are for; see the trust boundary above.
- The pre-commit hook running `doctrina validate` and blocking a
  commit. That is the documented behaviour.
- Templates pointing to project-relative paths that the user can
  rename. The user is the trust boundary for their own project.
- Slow validation on extremely large repositories. Performance is
  a quality concern, not a security concern.

## Out of scope

Doctrina ships no server, no SaaS, no hosted service. There is no
infrastructure to attack. Security reports about a "doctrina.com"
or similar are about a project that is not this one.

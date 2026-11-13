<!-- delta body below -->

# Spec — Console

**Capability:** console
**Status:** active
**Implementation:** implemented
**Realizes:** n/a — internal framework capability; product success criteria measure adopting-team outcomes, not the tool's own surface
**Depends on:** cli, insight
**Source:** `packages/doctrina-cli/src/commands/ui.js`, `packages/doctrina-cli/src/lib/{console-model,console-view,console-state,agent-bridge}.js`
**Last updated:** 2026-11-13
**Version:** 0.1.0

## Purpose

Define the console: the interactive window `doctrina ui` opens for the
human at a terminal. It shows the gates, the conversation and the open
work, runs any Doctrina command typed after `/`, and hands a request typed
in the person's own words to the AI agent they already use, through that
agent's own non-interactive command line (ADR 0032).

The commands the console runs, and what they print, belong to the specs
that own them; this spec owns the window, what is typed into it, and how
an agent is found, started and relayed.

## Requirements (EARS)

### Ubiquitous

- The system shall derive every frame of the console from one state object, with exactly the rows and columns the terminal has, leaving the last cell of the last row empty.
- The system shall show the gates across the top, the conversation as the body, a panel of the open work with its stage, the next step and the recently closed changes beside it, and the line being typed at the bottom.
- The system shall read the panel and the gates from the tree through a process of its own, when the console opens and after every command and every answer, and shall store no state of its own.
- The system shall run each command typed after `/` as the same CLI in a process of its own, without colour, and show its output as printed.
- The system shall choose the agent in this order: the one `DOCTRINA_AGENT` names, the one whose IDE terminal this is, the one the project has an adapter for, then the order of the catalog — Claude Code, Cursor, Codex, Gemini CLI.
- The system shall hand a request to an agent on its standard input where the agent reads one, and otherwise as a single argument, and append the arguments `DOCTRINA_AGENT_ARGS` holds.

### Event-driven

- When `doctrina ui` runs in a terminal, or `doctrina` runs there with no arguments, the system shall open the console on the terminal's alternate screen and, on leaving, restore the terminal and exit 0.
- When `doctrina ui` runs without a terminal or with `--frame`, the system shall print one frame — sized by `--cols` and `--rows` when given — and exit 0, noting on stderr that the console is interactive when `--frame` was not asked for.
- When `doctrina ui --json` runs, the system shall emit the panel's state: the kind of directory (project, workspace or none), the gates, the open work with its stage, the next steps, the artifacts `@` completes, and the agents found.
- When the typed line starts with `/`, the system shall list the commands that match — the session loop first, then the console's own, then the others — complete the chosen one on tab, and on enter run it when it needs no argument.
- When the word under the cursor starts with `@`, the system shall list the specs, open changes, skills, decisions and contracts the index names, and complete the chosen one as `@kind:id`.
- When a command line carrying a mention is run, the system shall pass the mention as the id it names.
- When a line that is not a command is sent and an agent is selected, the system shall start that agent in its non-interactive mode with the line as the request, append the path of each artifact the line mentions, and show the agent's words, each tool call, each call it was refused and the duration as they arrive.
- When an agent reports a session id, the system shall pass it back on the next request so the conversation continues, until `/new` or a change of agent.
- When a request is sent and no agent is selected or found, the system shall say so in the conversation and name `/work` as the way to open the change by hand.
- When esc is pressed while a command or an agent runs, the system shall interrupt that process and say so in the conversation.
- When the terminal is narrower than 84 columns, the system shall fold the panel into one strip under the gates.
- When the console runs at a workspace root, the system shall show the projects with their state and the open deliveries in place of the open changes.

### State-driven

- While a command or an agent is running, the system shall accept typing and hold the line until that process ends.

### Unwanted-behavior (must-not)

- The system shall not pass an agent any flag that skips its approvals, and shall not pass a typed request through a shell.
- The system shall not start an agent for anything but a request a person typed into the console.
- The system shall not read which agent to use from a file of the project.
- The system shall not take a binary named `agent` for Cursor's where neither Cursor's terminal nor a `.cursor/` directory is present.

## Acceptance criteria

The console is v0 spec-compliant when:

1. [verified] A chunk of terminal input is read as keys — arrows in both modes, a modifier, control keys, a bracketed paste as text, and a sequence cut by the chunk boundary completed by the next — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
2. [verified] The `/` list offers the session loop first, then the console's own commands, then a later word of a name, and never a match inside a word; enter runs a command that needs no argument and completes one that does; the arrows, tab and esc move, take and close the list — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
3. [verified] `@` completes an artifact the index names; in a command it becomes the id, in a request the agent receives the file it names and, for a skill, the instruction to follow it; a mention typed whole is sent with the line, and an e-mail address is not a mention — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
4. [verified] A request with an agent selected asks it and marks the console busy; a second one is typed but not sent until the first ends; esc interrupts; with no agent the console says where a request can go; the agent's tool calls, words, refused calls and duration land in the conversation and its session id is kept — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
5. [verified] Every frame is exactly the window's rows and columns at six sizes and four inputs, with the last cell of the last row left empty; the panel shows the open change's stage and task bar and the next step as it is typed in the console; under 84 columns it is one strip; the cursor follows the typed line across a wrap; a running job is named on the input box — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
6. [verified] Each agent's command line is the documented one with the session resumed, `DOCTRINA_AGENT_ARGS` appended, Claude's and Gemini's prompt on stdin, and no flag that skips approvals for any agent; a `.cmd` launcher runs only with the prompt on stdin and is refused otherwise; Cursor's and Codex's stream events are read as text, tool calls, sessions and results — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
7. [verified] The agent found first follows `DOCTRINA_AGENT`, then the IDE's terminal, then the project's adapter; `none` finds no agent; a bare `agent` binary is Cursor's only where Cursor is in use; a file that cannot be executed is not an agent — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
8. [verified] `ui --json` reports the kind, gates, open work with its stage, next steps, mentions and agents; `ui --frame` prints exactly the rows asked for; `ui` in a pipe prints one frame and a note; `doctrina` alone in a pipe prints the help; a directory with no project yields a frame that names `/init` — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.
9. [verified] In a terminal the console runs `/next` and shows what it prints, sends two requests in one conversation with the session resumed on the second, starts a new one after `/new`, interrupts an agent that never ends, and on `/quit` exits 0 having restored the terminal — verified by `packages/doctrina-cli/test/o-console-da-um-rosto-ao-doctrina.test.js`.

## Out of scope for this spec

- What each Doctrina command does and prints — covered by the spec that
  owns the command.
- What an agent does with a request, and what it may edit or run: its own
  settings decide (ADR 0032).
- A chat pane already open in an IDE: the console's conversation is a
  session of its own.

// @ts-check
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { EXIT } from "../lib/exit-codes.js";
import { consoleState } from "../lib/console-state.js";
import { agentById, agentInvocation, agentPrompt, detectAgents } from "../lib/agent-bridge.js";
import { agentEvent, agentExit, commandDone, commandLine, initialState, parseKeys, pressKey } from "../lib/console-model.js";
import { renderFrame } from "../lib/console-view.js";

// `doctrina ui` — the console (change 0257, ADR 0032).
//
// A face for the human. Everything it shows is decided in lib/: the state
// (console-model), the frame (console-view), the panel (console-state) and
// how an agent is started (agent-bridge). This module is the terminal: it
// reads keys, paints frames, and runs what the model asks for — a Doctrina
// command or the agent — each as a process of its own, so the console shows
// exactly what that command prints anywhere else.

export const jsonNative = true;

export const flags = { boolean: ["json", "frame"], string: ["cols", "rows"] };

const CLI = fileURLToPath(new URL("../index.js", import.meta.url));
const ENTER = "\x1b[?1049h\x1b[?2004h";
const LEAVE = "\x1b[?2004l\x1b[?25h\x1b[?1049l";
const SIGNALS = /** @type {const} */ (["SIGTERM", "SIGHUP"]);

export async function run(_positional, cmdFlags) {
  const cwd = process.cwd();
  if (flagBool(cmdFlags, "json", false)) {
    emitJson("ui", { ...consoleState(cwd), agents: detectAgents({ cwd }).map((a) => ({ id: a.id, label: a.label, file: a.file })) });
    return EXIT.OK;
  }
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && !flagBool(cmdFlags, "frame", false);
  if (!interactive) {
    const size = (/** @type {string} */ name, /** @type {number} */ fallback) => {
      const n = Number(flagString(cmdFlags, name));
      return Number.isInteger(n) && n > 0 ? n : fallback;
    };
    const state = initialState({ agents: detectAgents({ cwd }), panel: consoleState(cwd) });
    const frame = renderFrame(state, { cols: size("cols", process.stdout.columns || 100), rows: size("rows", process.stdout.rows || 30), color: c.enabled });
    console.log(frame.lines.join("\n"));
    if (!flagBool(cmdFlags, "frame", false)) {
      console.error(c.gray("note:  ") + "the console is interactive — run `doctrina ui` in a terminal; this is one frame of it");
    }
    return EXIT.OK;
  }
  return new Promise((resolve) => { session(cwd, resolve); });
}

/** Lines out of a stream, whole. */
function byLine(stream, onLine) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (/** @type {string} */ chunk) => {
    const parts = (pending + chunk).split(/\r?\n/);
    pending = parts.pop() ?? "";
    for (const line of parts) onLine(line);
  });
  stream.on("end", () => {
    if (pending !== "") onLine(pending);
    pending = "";
  });
}

/**
 * The interactive session. The terminal is a parameter, so a test drives it
 * with streams of its own and reads the frames it paints.
 * @param {string} cwd
 * @param {(code: number) => void} done
 * @param {{ inp?: any, out?: any, env?: NodeJS.ProcessEnv, color?: boolean }} [io]
 */
export function session(cwd, done, { inp = process.stdin, out = process.stdout, env = process.env, color = c.enabled } = {}) {
  let state = initialState({ agents: detectAgents({ cwd, env }) });
  /** @type {{ proc: import("node:child_process").ChildProcess, kind: "command" | "agent", finished: boolean } | null} */
  let running = null;
  let refreshing = false;
  let stale = false;
  let queued = false;
  let pendingKeys = "";
  let closed = false;
  /** @type {NodeJS.Timeout | null} */
  let ticker = null;

  const paint = () => {
    queued = false;
    if (closed) return;
    const { lines, cursor } = renderFrame(state, { cols: out.columns || 80, rows: out.rows || 24, color });
    out.write(`\x1b[?25l\x1b[H${lines.join("\r\n")}\x1b[${cursor.row + 1};${cursor.col + 1}H\x1b[?25h`);
    // The spinner and the clock move while something runs.
    if (state.busy && !ticker) ticker = setInterval(schedule, 120);
    if (!state.busy && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
  const schedule = () => {
    if (queued || closed) return;
    queued = true;
    setImmediate(paint);
  };

  const refresh = () => {
    if (refreshing) {
      stale = true;
      return;
    }
    refreshing = true;
    let text = "";
    const proc = spawn(process.execPath, [CLI, "ui", "--json"], { cwd, env, stdio: ["ignore", "pipe", "ignore"] });
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (/** @type {string} */ d) => { text += d; });
    const settle = () => {
      refreshing = false;
      try {
        const panel = JSON.parse(text);
        if (panel && typeof panel === "object" && Array.isArray(panel.gates)) state = { ...state, panel };
      } catch { /* the panel keeps what it showed */ }
      if (stale) {
        stale = false;
        refresh();
      }
      schedule();
    };
    proc.on("error", settle);
    proc.on("close", settle);
  };

  const finish = (/** @type {{ proc: import("node:child_process").ChildProcess }} */ job) => {
    if (running === job) running = null;
    refresh();
    schedule();
  };

  const runCommand = (/** @type {string[]} */ argv) => {
    /** @type {NodeJS.ProcessEnv} */
    const plain = { ...env, NO_COLOR: "1" };
    delete plain.FORCE_COLOR;
    const proc = spawn(process.execPath, [CLI, ...argv], { cwd, env: plain, stdio: ["ignore", "pipe", "pipe"] });
    const job = { proc, kind: /** @type {const} */ ("command"), finished: false };
    running = job;
    byLine(proc.stdout, (line) => { state = commandLine(state, "stdout", line); schedule(); });
    byLine(proc.stderr, (line) => { state = commandLine(state, "stderr", line); schedule(); });
    proc.on("error", (err) => {
      state = commandDone(commandLine(state, "stderr", `could not start the command: ${err.message}`), 1, null);
      finish(job);
    });
    proc.on("close", (code, signal) => {
      if (!job.finished) state = commandDone(state, code ?? 1, signal);
      job.finished = true;
      finish(job);
    });
  };

  const askAgent = (/** @type {string} */ prompt) => {
    const agent = state.agents.find((a) => a.id === state.agent);
    const spec = agent ? agentById(agent.id) : null;
    if (!agent || !spec) {
      state = agentExit(state, 1, null, "no agent is selected");
      schedule();
      return;
    }
    const call = agentInvocation(agent, agentPrompt(prompt, state.panel?.mentions ?? []), { session: state.session, env });
    if (call.refused) {
      state = agentExit(state, 1, null, call.refused);
      schedule();
      return;
    }
    const proc = spawn(call.file, call.args, { cwd, env, stdio: [call.stdin === null ? "ignore" : "pipe", "pipe", "pipe"], shell: call.shell });
    const job = { proc, kind: /** @type {const} */ ("agent"), finished: false };
    running = job;
    let stderr = "";
    if (call.stdin !== null && proc.stdin) {
      proc.stdin.on("error", () => { /* the agent closed its input early */ });
      proc.stdin.end(call.stdin);
    }
    if (proc.stdout) {
      byLine(proc.stdout, (line) => {
        for (const ev of spec.parse(line)) {
          if (ev.type === "result") job.finished = true;
          state = agentEvent(state, ev);
        }
        schedule();
      });
    }
    if (proc.stderr) {
      proc.stderr.setEncoding("utf8");
      proc.stderr.on("data", (/** @type {string} */ d) => { stderr = (stderr + d).slice(-2000); });
    }
    proc.on("error", (err) => {
      if (!job.finished) state = agentExit(state, 1, null, `could not start ${agent.label}: ${err.message}`);
      job.finished = true;
      finish(job);
    });
    proc.on("close", (code, signal) => {
      if (!job.finished) state = agentExit(state, code ?? 1, signal, stderr);
      job.finished = true;
      finish(job);
    });
  };

  const interrupt = () => {
    const job = running;
    if (!job) return;
    job.proc.kill("SIGINT");
    setTimeout(() => {
      if (running === job && !job.finished) job.proc.kill("SIGTERM");
    }, 2000).unref();
  };

  const leave = () => {
    if (closed) return;
    closed = true;
    if (ticker) clearInterval(ticker);
    if (running) running.proc.kill("SIGTERM");
    inp.off("data", onData);
    out.off("resize", onResize);
    process.off("exit", restore);
    for (const sig of SIGNALS) process.off(sig, leave);
    if (inp.isTTY) inp.setRawMode(false);
    inp.pause();
    out.write(LEAVE);
    done(EXIT.OK);
  };

  /** @param {import("../lib/console-model.js").Effect[]} effects */
  const perform = (effects) => {
    for (const effect of effects) {
      if (effect.type === "run") runCommand(effect.argv);
      else if (effect.type === "ask") askAgent(effect.prompt);
      else if (effect.type === "interrupt") interrupt();
      else if (effect.type === "refresh") refresh();
      else if (effect.type === "quit") leave();
    }
  };

  function onData(/** @type {string} */ data) {
    const { keys, rest } = parseKeys(pendingKeys + data);
    pendingKeys = rest;
    for (const key of keys) {
      const next = pressKey(state, key);
      state = next.state;
      perform(next.effects);
      if (closed) return;
    }
    schedule();
  }
  function onResize() {
    out.write("\x1b[2J");
    schedule();
  }

  // The terminal is given back whatever ends the process.
  function restore() {
    if (!closed) out.write(LEAVE);
  }
  process.once("exit", restore);
  for (const sig of SIGNALS) process.once(sig, leave);

  out.write(ENTER);
  inp.setRawMode(true);
  inp.setEncoding("utf8");
  inp.resume();
  inp.on("data", onData);
  out.on("resize", onResize);
  paint();
  refresh();
}

export const help = `
Usage: doctrina ui [--frame] [--cols <n>] [--rows <n>] [--json]

The console: Doctrina with a face, for the human at the terminal. Running
\`doctrina\` with no arguments in a terminal opens it too.

  ◆ Doctrina │ <project>                        ● <agent>   v<version>
  index ✓   coverage ✓ 100%   trace ✓ 5/5   verify ✓ 8 checks
  ───────────────────────────────────────────┬───────────────────────
   the conversation                          │ OPEN WORK
   what you asked, what each command         │ <change> ● plan ─ ○ build ─ ○ close
   printed, what the agent said and did      │ NEXT · RECENTLY CLOSED
  ╭──────────────────────────────────────────┴──────────────────────╮
  │ › the line you type                                             │
  ╰─────────────────────────────────────────────────────────────────╯

What you type:

  a request     In your own words. It goes to the AI agent you already use,
                through that agent's non-interactive mode, and everything it
                says and does is shown as it happens. The next request
                continues the same conversation; /new starts another.
  /command      A Doctrina command, as you would type it after \`doctrina\`:
                /next, /status, /work "<request>", /close <id>. A list
                completes it as you type (tab), and enter runs it.
  @artifact     Mention a spec, an open change, a skill or a decision —
                @spec:auth, @change:0001-login, @skill:cut-a-release,
                @adr:0005. In a command it becomes the id; in a request the
                agent is told the file it names.
  ?             What the console understands.

The panel and the gates are read from the tree when the console opens and
after every command and every answer; the console stores nothing.

The agent is found on PATH: claude (Claude Code), cursor-agent (Cursor),
codex, gemini — the one whose IDE terminal this is first, then the one the
project has an adapter for. DOCTRINA_AGENT=<name> pins one (none disables
it), /agent switches inside the console, and DOCTRINA_AGENT_ARGS adds
flags of your own to its command line. Doctrina passes no flag that skips
an agent's approvals: what the agent may edit or run is its own settings'
to say, and a call it refuses is reported in the conversation. It is the
same agent, account and rules as in your IDE, in a session of its own — it
does not type into a chat pane that is already open.

Keys: enter send · tab complete · ↑↓ history (or the list) · pgup/pgdn
scroll · esc interrupt or clear · ctrl+c twice (or /quit) to leave.

Options:
  --frame       Print one frame and exit instead of opening the console
                (what a pipe or a script gets anyway)
  --cols <n>    The frame's width, with --frame (default: the terminal's, or 100)
  --rows <n>    The frame's height, with --frame (default: the terminal's, or 30)
  --json        The panel's state — gates, open work, next steps, the
                artifacts @ completes, the agents found — as JSON
`;

// @ts-check
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { flagBool, flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { emitJson } from "../lib/json-out.js";
import { EXIT } from "../lib/exit-codes.js";
import { consoleState } from "../lib/console-state.js";
import { agentById, agentCatalog, agentInvocation, agentPrompt, detectAgents } from "../lib/agent-bridge.js";
import { consolePrefs, saveConsolePrefs } from "../lib/console-prefs.js";
import { agentEvent, agentExit, commandDone, commandLine, initialState, messageReceived, parseKeys, peersSeen, pressKey, settle } from "../lib/console-model.js";
import { beat, joinRoom, leaveRoom, listPeers, messageId, roomPeers, sendMessage, takeInbox } from "../lib/console-room.js";
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

export const flags = { boolean: ["json", "frame", "peers"], string: ["cols", "rows", "send", "timeout"] };

const CLI = fileURLToPath(new URL("../index.js", import.meta.url));
const ENTER = "\x1b[?1049h\x1b[?2004h";
const LEAVE = "\x1b[?2004l\x1b[?25h\x1b[?1049l";
const SIGNALS = /** @type {const} */ (["SIGTERM", "SIGHUP"]);

const peerView = (/** @type {import("../lib/console-room.js").Peer} */ p) => ({ id: p.id, name: p.name, role: p.role, agent: p.agent, model: p.model, busy: p.busy, listening: p.listening });

export async function run(positional, cmdFlags) {
  const cwd = process.cwd();
  if (flagBool(cmdFlags, "json", false)) {
    const prefs = consolePrefs(cwd);
    emitJson("ui", {
      ...consoleState(cwd),
      agents: agentCatalog({ cwd }).map((a) => ({ id: a.id, label: a.label, file: a.file, model: prefs.models[a.id] ?? null })),
      peers: roomPeers(cwd).map(peerView),
    });
    return EXIT.OK;
  }
  if (flagBool(cmdFlags, "peers", false)) {
    const peers = roomPeers(cwd);
    if (peers.length === 0) console.log("no console is open in this room — open one in a terminal: doctrina ui");
    for (const p of peers) {
      console.log(`${p.name.padEnd(16)} ${p.role === "planner" ? "planner" : "console"}  ${(p.agent ?? "no agent").padEnd(9)} ${p.busy ? "busy" : "idle"}${p.listening ? "" : "  not listening"}  ${p.cwd}`);
    }
    return EXIT.OK;
  }
  const to = flagString(cmdFlags, "send");
  if (to !== undefined) return sendFromCli(cwd, to, positional.join(" ").trim(), Number(flagString(cmdFlags, "timeout")));
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && !flagBool(cmdFlags, "frame", false);
  if (!interactive) {
    const size = (/** @type {string} */ name, /** @type {number} */ fallback) => {
      const n = Number(flagString(cmdFlags, name));
      return Number.isInteger(n) && n > 0 ? n : fallback;
    };
    const state = initialState({ agents: detectAgents({ cwd }), catalog: agentCatalog({ cwd }), prefs: consolePrefs(cwd), panel: consoleState(cwd) });
    const frame = renderFrame(state, { cols: size("cols", process.stdout.columns || 100), rows: size("rows", process.stdout.rows || 30), color: c.enabled });
    console.log(frame.lines.join("\n"));
    if (!flagBool(cmdFlags, "frame", false)) {
      console.error(c.gray("note:  ") + "the console is interactive — run `doctrina ui` in a terminal; this is one frame of it");
    }
    return EXIT.OK;
  }
  return new Promise((resolve) => { session(cwd, resolve); });
}

/**
 * `doctrina ui --send <name> "<request>"`: hand a console a request from
 * outside one — what a planner's agent runs — and wait for its report.
 * @param {string} cwd
 * @param {string} to
 * @param {string} text
 * @param {number} seconds
 */
async function sendFromCli(cwd, to, text, seconds) {
  const env = process.env;
  if (to.trim() === "" || text === "") {
    console.error(c.red("error:") + " ui --send takes the console's name and the request: doctrina ui --send <name> \"<request>\"");
    return EXIT.USAGE;
  }
  // A request that was handed over is not handed on: two consoles waiting
  // on each other would wait until both gave up.
  if (env.DOCTRINA_CONSOLE_SERVING) {
    console.error(c.red("error:") + ` this console is answering "${env.DOCTRINA_CONSOLE_SERVING}" — a request that was handed over is done here, not handed on`);
    return EXIT.GATE;
  }
  const room = joinRoom(cwd, { env, role: "sender", name: env.DOCTRINA_CONSOLE_NAME || undefined });
  try {
    const peers = listPeers(room).filter((p) => p.name !== env.DOCTRINA_CONSOLE_NAME);
    const target = peers.find((p) => p.name === to || p.id === to);
    if (!target) {
      console.error(c.red("error:") + ` no console named "${to}" is open in this room`);
      console.error(c.gray("hint: ") + (peers.length ? `open: ${peers.map((p) => p.name).join(", ")}` : "open one in that repository's terminal: doctrina ui"));
      return EXIT.PRECONDITION;
    }
    if (!target.listening) {
      console.error(c.red("error:") + ` ${target.name} is not listening — /listen on in that console`);
      return EXIT.PRECONDITION;
    }
    const id = messageId();
    const card = { cwd, agent: null, model: null, busy: false, listening: false };
    beat(room, card);
    if (!sendMessage(room, target.id, { type: "request", id, from: { id: room.id, name: room.name }, text, at: Date.now() })) {
      console.error(c.red("error:") + ` ${target.name} closed before the request reached it`);
      return EXIT.PRECONDITION;
    }
    const limit = Number.isFinite(seconds) && seconds > 0 ? seconds : 600;
    const end = Date.now() + limit * 1000;
    while (Date.now() < end) {
      await new Promise((r) => setTimeout(r, 300));
      beat(room, card);
      for (const m of takeInbox(room)) {
        if (m.type === "result" && m.re === id) {
          console.log(`${m.from.name} ${m.ok ? "finished" : "failed"}${m.detail ? ` — ${m.detail}` : ""}`);
          if (m.summary) console.log(`\n${m.summary}`);
          return m.ok ? EXIT.OK : EXIT.GATE;
        }
        if (m.type === "refused" && m.re === id) {
          console.error(c.red("error:") + ` ${m.from.name} did not take the request: ${m.reason}`);
          return EXIT.GATE;
        }
      }
      if (!listPeers(room).some((p) => p.id === target.id)) {
        console.error(c.red("error:") + ` ${target.name} closed before it reported`);
        return EXIT.GATE;
      }
    }
    console.error(c.red("error:") + ` no report from ${target.name} after ${limit}s — it may still be working; its console shows it`);
    return EXIT.GATE;
  } finally {
    leaveRoom(room);
  }
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
 * @param {{ inp?: any, out?: any, env?: NodeJS.ProcessEnv, color?: boolean, poll?: number }} [io]
 */
export function session(cwd, done, { inp = process.stdin, out = process.stdout, env = process.env, color = c.enabled, poll = 700 } = {}) {
  let state = initialState({ agents: detectAgents({ cwd, env }), catalog: agentCatalog({ cwd, env }), prefs: consolePrefs(cwd, env) });
  // The room: the other consoles opened for the same work. A home that
  // cannot be written leaves this console alone, and working.
  /** @type {import("../lib/console-room.js").Room | null} */
  let room = null;
  try {
    room = joinRoom(cwd, { env });
  } catch {
    room = null;
  }
  /** @type {NodeJS.Timeout | null} */
  let pulseTimer = null;
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

  const card = () => ({ cwd, agent: state.agent, model: (state.agent ? state.models[state.agent] : null) ?? null, busy: Boolean(state.busy), listening: state.listening });

  // Nothing runs any more: the console that asked gets its report, and the
  // next request that was waiting starts.
  const ended = () => {
    const after = settle(state);
    state = after.state;
    perform(after.effects);
    if (room) beat(room, card());
    refresh();
    schedule();
  };

  const finish = (/** @type {{ proc: import("node:child_process").ChildProcess }} */ job) => {
    if (running === job) running = null;
    ended();
  };

  // One look at the room: say this console is alive, see who else is, and
  // take what arrived.
  const pulse = () => {
    if (!room || closed) return;
    beat(room, card());
    state = peersSeen(state, { name: room.name, role: room.role, root: room.root }, listPeers(room).map(peerView));
    for (const m of takeInbox(room)) {
      const got = messageReceived(state, m);
      state = got.state;
      perform(got.effects);
    }
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

  const askAgent = (/** @type {string} */ prompt, /** @type {string | null} */ origin) => {
    const agent = state.agents.find((a) => a.id === state.agent);
    const spec = agent ? agentById(agent.id, env) : null;
    if (!agent || !spec) {
      state = agentExit(state, 1, null, "no agent is selected");
      ended();
      return;
    }
    const full = agentPrompt(prompt, state.panel?.mentions ?? [], { peers: state.peers, origin });
    const call = agentInvocation(agent, full, { session: state.session, model: state.models[agent.id] ?? null, env });
    if (call.refused) {
      state = agentExit(state, 1, null, call.refused);
      ended();
      return;
    }
    // The agent's own `doctrina ui --send` speaks as this console, and one
    // answering a request another console sent may not hand it on.
    const agentEnv = { ...env, DOCTRINA_CONSOLE_NAME: room?.name ?? "", DOCTRINA_CONSOLE_SERVING: origin ?? "" };
    const proc = spawn(call.file, call.args, { cwd, env: agentEnv, stdio: [call.stdin === null ? "ignore" : "pipe", "pipe", "pipe"], shell: call.shell });
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
    if (pulseTimer) clearInterval(pulseTimer);
    if (room) leaveRoom(room);
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
      else if (effect.type === "ask") askAgent(effect.prompt, effect.origin ?? null);
      else if (effect.type === "beat") {
        if (room) beat(room, card());
      } else if (effect.type === "send" && room) {
        const from = { id: room.id, name: room.name };
        for (const target of effect.to) {
          if (!sendMessage(room, target.id, { type: "request", id: messageId(), from, text: effect.text, at: Date.now() })) {
            state = commandLine(state, "stderr", `${target.name} closed before the request reached it`);
          }
        }
      } else if (effect.type === "reply" && room) {
        const from = { id: room.id, name: room.name };
        sendMessage(room, effect.to, effect.refused
          ? { type: "refused", re: effect.re, from, reason: effect.refused, at: Date.now() }
          : { type: "result", re: effect.re, from, ok: effect.ok, summary: effect.summary, detail: effect.detail, at: Date.now() });
      }
      else if (effect.type === "interrupt") interrupt();
      else if (effect.type === "refresh") refresh();
      else if (effect.type === "save") saveConsolePrefs(cwd, { agent: state.agent, models: state.models }, env);
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
  pulse();
  pulseTimer = setInterval(pulse, poll);
}

export const help = `
Usage: doctrina ui [--frame] [--cols <n>] [--rows <n>] [--json]
       doctrina ui --peers
       doctrina ui --send <name> "<request>" [--timeout <seconds>]

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
after every command and every answer; the console keeps nothing about the
project.

The agent is found on PATH: claude (Claude Code), cursor-agent (Cursor),
copilot (GitHub Copilot, VS Code), codex, gemini, opencode — or one of
your own, declared in $DOCTRINA_HOME/agents.json. /agent lists them all,
installed or not, and switches; /model names the model the agent in use
runs (/model default goes back). The one used first is the one you chose
here before, then the IDE whose terminal this is, then the one the
project has an adapter for. DOCTRINA_AGENT=<name> pins one (none disables
it) and DOCTRINA_AGENT_ARGS adds flags of your own to its command line.
The choice is kept per directory in $DOCTRINA_HOME/console.json.

Doctrina passes no flag that skips an agent's approvals: what the agent
may edit or run is its own settings' to say, and a call it refuses is
reported in the conversation. It is the same agent, account and rules as
in your IDE, in a session of its own — it does not type into a chat pane
that is already open.

Several consoles (ADR 0033). Consoles opened for the same work — the
repositories of one workspace and its root, or the same directory — share
a room: each sees the others (the header counts them, the panel lists
them, /peers says what each is doing) and can hand one a request:

  /send <name> <request>    that console's agent does it there, in its own
                            repository, and its last message comes back
                            here as the report. /send all … asks every one.
  /listen off               this console stops taking requests (on again
                            with /listen on). It takes them by default.

A request that arrives while something runs waits its turn, and is shown
with the console it came from. The room is files under $DOCTRINA_HOME,
yours alone to read and write: no port is opened and nothing leaves the
machine. The agent of a console is told which consoles are open, and can
hand one a task itself with \`doctrina ui --send <name> "<request>"\`,
which waits for the report — so a planner's agent at the workspace root
can give each repository its card. A request that was handed over is done
where it lands: it is not handed on.

Keys: enter send · tab complete · ↑↓ history (or the list) · pgup/pgdn
scroll · esc interrupt or clear · ctrl+c twice (or /quit) to leave.

Options:
  --frame       Print one frame and exit instead of opening the console
                (what a pipe or a script gets anyway)
  --cols <n>    The frame's width, with --frame (default: the terminal's, or 100)
  --rows <n>    The frame's height, with --frame (default: the terminal's, or 30)
  --json        The panel's state — gates, open work, next steps, the
                artifacts @ completes, every agent known and the model
                chosen for it, the consoles open in the room — as JSON
  --peers       List the consoles open in this room and exit
  --send <name> Hand the console <name> a request and wait for its report:
                exit 0 when its agent finished, 1 when it failed, was
                refused or did not report in time, 3 when no such console
                is open
  --timeout <s> How long --send waits for the report (default 600)
`;

// @ts-check
import path from "node:path";
import { accessSync, constants, statSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { doctrinaHome } from "./workspace-locate.js";

// THE AGENT THE CONSOLE TALKS TO (change 0257, ADR 0032).
//
// The CLI never calls a model (ADR 0005) and still does not. What a human
// types into the console as a request goes to the AI agent they already
// use, through that agent's own non-interactive mode: the same binary, the
// same account, the same rules and hooks the IDE session reads. Doctrina
// starts it with the prompt, relays what it prints, and remembers the
// session id so the next prompt continues the conversation.
//
// It is the same agent, not the same window: there is no public door into a
// chat pane that is already open in an IDE, so the console's conversation
// is its own session of that agent, in the same repository.
//
// Each agent is described by what its documentation states: the binary, how
// a prompt is passed, the output it streams, how a session resumes. Nothing
// here widens what the agent may do. No flag that skips its approvals is
// ever passed; the person adds flags of their own in DOCTRINA_AGENT_ARGS.

/**
 * @typedef {{ type: "session", id: string }
 *   | { type: "text", text: string }
 *   | { type: "tool", name: string, detail: string }
 *   | { type: "result", ok: boolean, turns: number | null, ms: number | null, denials: string[], error: string }
 *   | { type: "model", name: string }
 *   | { type: "raw", text: string }} AgentEvent
 */

/**
 * @typedef {{
 *   id: string, label: string, bins: string[], exercised: boolean,
 *   stdin: boolean,
 *   about: string,
 *   model: string[] | null,
 *   models: string[],
 *   listing: string,
 *   custom?: boolean,
 *   args: (prompt: string, opts: { session: string | null, extra: string[] }) => string[],
 *   parse: (line: string) => AgentEvent[],
 * }} AgentSpec
 *
 * `about` says which product the binary belongs to; `model` is how a model
 * is named on its command line (`{model}` is replaced), or null when it
 * takes none; `models` are names it is known to accept — examples for the
 * list `/model` completes from, never a limit on what may be typed;
 * `listing` is how the agent itself shows the models an account has.
 */

const clip = (/** @type {unknown} */ v, n = 160) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

/** One line that says what a tool call does, from its input. */
function toolDetail(input) {
  if (input === null || typeof input !== "object") return clip(input);
  const o = /** @type {Record<string, unknown>} */ (input);
  for (const key of ["command", "file_path", "path", "pattern", "url", "query", "description", "prompt"]) {
    if (typeof o[key] === "string" && o[key] !== "") return clip(o[key]);
  }
  const first = Object.values(o).find((v) => typeof v === "string" && v !== "");
  return first ? clip(first) : "";
}

function json(line) {
  const text = line.trim();
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const rawOf = (/** @type {string} */ line) => (line.trim() === "" ? [] : [{ type: /** @type {const} */ ("raw"), text: line.replace(/\s+$/, "") }]);

/** Claude Code's and Cursor's `stream-json`: one event per line. */
function parseStreamJson(line) {
  const e = json(line);
  if (!e) return rawOf(line);
  /** @type {AgentEvent[]} */
  const out = [];
  if (e.type === "system" && e.subtype === "init" && typeof e.session_id === "string") {
    out.push({ type: "session", id: e.session_id });
    // The model the agent says it is running: shown, never assumed.
    if (typeof e.model === "string" && e.model !== "") out.push({ type: "model", name: e.model });
  } else if (e.type === "assistant") {
    for (const part of Array.isArray(e.message?.content) ? e.message.content : []) {
      if (part?.type === "text" && typeof part.text === "string" && part.text.trim() !== "") out.push({ type: "text", text: part.text });
      else if (part?.type === "tool_use") out.push({ type: "tool", name: String(part.name ?? "tool"), detail: toolDetail(part.input) });
    }
  } else if (e.type === "tool_call" && e.subtype === "started") {
    // Cursor names the tool by the key it nests the call under.
    const call = e.tool_call && typeof e.tool_call === "object" ? e.tool_call : {};
    const key = Object.keys(call)[0] ?? "tool";
    const body = call[key] ?? {};
    const name = key === "function" ? String(body.name ?? "tool") : key.replace(/ToolCall$/, "").replace(/^./, (ch) => ch.toUpperCase());
    out.push({ type: "tool", name, detail: toolDetail(key === "function" ? body.arguments : body.args) });
  } else if (e.type === "result") {
    if (typeof e.session_id === "string") out.push({ type: "session", id: e.session_id });
    const denials = (Array.isArray(e.permission_denials) ? e.permission_denials : [])
      .map((/** @type {any} */ d) => `${d?.tool_name ?? "tool"}(${toolDetail(d?.tool_input)})`);
    const ok = e.is_error !== true && (e.subtype === undefined || e.subtype === "success");
    out.push({
      type: "result", ok,
      turns: typeof e.num_turns === "number" ? e.num_turns : null,
      ms: typeof e.duration_ms === "number" ? e.duration_ms : null,
      denials: [...new Set(denials)],
      error: ok ? "" : clip(e.result ?? e.subtype ?? "the agent reported an error", 300),
    });
  }
  return out;
}

/** `codex exec --json`: JSON Lines of thread, turn and item events. */
function parseCodex(line) {
  const e = json(line);
  if (!e) return rawOf(line);
  /** @type {AgentEvent[]} */
  const out = [];
  if (e.type === "thread.started" && typeof e.thread_id === "string") out.push({ type: "session", id: e.thread_id });
  else if (e.type === "item.completed" && e.item && typeof e.item === "object") {
    const kind = String(e.item.type ?? "");
    if (/agent_?message/i.test(kind) && typeof e.item.text === "string") out.push({ type: "text", text: e.item.text });
    else if (/command/i.test(kind)) out.push({ type: "tool", name: "Shell", detail: clip(e.item.command) });
    else if (/file/i.test(kind)) out.push({ type: "tool", name: "Edit", detail: toolDetail(e.item) });
  } else if (e.type === "turn.completed") out.push({ type: "result", ok: true, turns: null, ms: null, denials: [], error: "" });
  else if (e.type === "turn.failed" || e.type === "error") {
    out.push({ type: "result", ok: false, turns: null, ms: null, denials: [], error: clip(e.error?.message ?? e.message ?? "the agent reported an error", 300) });
  }
  return out;
}

/** Plain text: every line is something the agent said. */
const parseText = (/** @type {string} */ line) => (line.trim() === "" ? [] : [{ type: /** @type {const} */ ("text"), text: line.replace(/\s+$/, "") }]);

/** @type {AgentSpec[]} */
export const AGENTS = [
  { id: "claude", label: "Claude Code", bins: ["claude"], exercised: true, stdin: true,
    about: "Anthropic's Claude Code — the CLI the Claude extensions for VS Code and JetBrains run",
    model: ["--model", "{model}"], models: ["opus", "sonnet", "haiku"], listing: "`/model` inside `claude`",
    // The prompt goes in on stdin: no length limit, and nothing a person
    // typed is ever an argument. Edits are accepted and `doctrina` may run —
    // the cycle needs both; every other command still asks, which in print
    // mode means it is refused and reported.
    args: (_prompt, { session, extra }) => ["-p", "--output-format", "stream-json", "--verbose",
      "--permission-mode", "acceptEdits", "--allowedTools", "Bash(doctrina:*)",
      ...(session ? ["--resume", session] : []), ...extra],
    parse: parseStreamJson },
  { id: "cursor", label: "Cursor", bins: ["cursor-agent", "agent"], exercised: false, stdin: false,
    about: "the Cursor CLI — the agent of the Cursor IDE, with its account and rules",
    model: ["--model", "{model}"], models: [], listing: "`agent models`",
    args: (prompt, { session, extra }) => ["-p", "--output-format", "stream-json",
      ...(session ? ["--resume", session] : []), ...extra, prompt],
    parse: parseStreamJson },
  { id: "copilot", label: "GitHub Copilot", bins: ["copilot"], exercised: false, stdin: false,
    about: "GitHub Copilot CLI — the agent of GitHub Copilot in VS Code, with its account",
    model: ["--model={model}"], models: [], listing: "`/model` inside `copilot`",
    // Its programmatic mode documents no session to resume: each request
    // starts a conversation. It may write files and run `doctrina`.
    args: (prompt, { extra }) => ["-p", prompt, "-s", "--allow-tool=write, shell(doctrina:*)", ...extra],
    parse: parseText },
  { id: "codex", label: "Codex", bins: ["codex"], exercised: false, stdin: false,
    about: "OpenAI's Codex CLI — the CLI the Codex extension for VS Code runs",
    model: ["--model", "{model}"], models: [], listing: "`codex debug models`",
    args: (prompt, { session, extra }) => ["exec", ...(session ? ["resume", session] : []),
      "--json", "--sandbox", "workspace-write", ...extra, prompt],
    parse: parseCodex },
  { id: "gemini", label: "Gemini CLI", bins: ["gemini"], exercised: false, stdin: true,
    about: "Google's Gemini CLI — the agent behind Gemini Code Assist's agent mode in VS Code",
    model: ["--model", "{model}"], models: ["auto", "pro", "flash", "flash-lite"], listing: "`/model` inside `gemini`",
    // Plain text out carries no session id, so each request starts a conversation.
    args: (_prompt, { extra }) => ["--approval-mode", "auto_edit", ...extra],
    parse: parseText },
  { id: "opencode", label: "opencode", bins: ["opencode"], exercised: false, stdin: false,
    about: "the opencode CLI",
    // Only `opencode run "<prompt>"` is on the page Doctrina was built from:
    // a model goes in DOCTRINA_AGENT_ARGS, as that CLI names it.
    model: null, models: [], listing: "",
    args: (prompt, { extra }) => ["run", ...extra, prompt],
    parse: parseText },
];

// AN AGENT OF THE PERSON'S OWN (change 0258).
//
// The catalog above is the agents Doctrina knows how to start. A person who
// uses another — or a wrapper of their own — declares it once, in
// `$DOCTRINA_HOME/agents.json`, as the command line they would type:
//
//   { "agents": [ { "id": "mine", "label": "My agent", "command": "mycli",
//       "args": ["run", "{prompt}"], "model": ["--model", "{model}"],
//       "resume": ["--session", "{session}"], "models": ["small", "large"] } ] }
//
// `{prompt}` is where the request goes; with no `{prompt}` it goes in on
// stdin. Its output is read as plain text, or as `stream-json` when
// `"output"` says so. It is the person's file, never the project's.
export const CUSTOM_AGENTS_FILE = "agents.json";

const isStrings = (/** @type {unknown} */ v) => Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * The agents `$DOCTRINA_HOME/agents.json` declares, and what is wrong with it.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ specs: AgentSpec[], errors: string[] }}
 */
export function customAgents(env = process.env) {
  const file = path.join(doctrinaHome(env), CUSTOM_AGENTS_FILE);
  /** @type {AgentSpec[]} */
  const specs = [];
  /** @type {string[]} */
  const errors = [];
  if (!isFile(file)) return { specs, errors };
  let data;
  try {
    data = JSON.parse(read(file));
  } catch (err) {
    return { specs, errors: [`${file} is not valid JSON: ${/** @type {Error} */ (err).message}`] };
  }
  const list = Array.isArray(data?.agents) ? data.agents : null;
  if (!list) return { specs, errors: [`${file}: expected { "agents": [ … ] }`] };
  list.forEach((/** @type {any} */ a, /** @type {number} */ i) => {
    const where = `${file}: agents[${i}]`;
    if (!a || typeof a !== "object") return errors.push(`${where} is not an object`);
    if (typeof a.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(a.id)) return errors.push(`${where}.id must be lowercase letters, digits and hyphens`);
    if (AGENTS.some((b) => b.id === a.id) || specs.some((b) => b.id === a.id)) return errors.push(`${where}.id "${a.id}" is already an agent`);
    if (typeof a.command !== "string" || a.command.trim() === "") return errors.push(`${where}.command names the binary to run`);
    for (const key of ["args", "model", "resume", "models"]) {
      if (a[key] !== undefined && !isStrings(a[key])) return errors.push(`${where}.${key} must be an array of strings`);
    }
    /** @type {string[]} */
    const args = a.args ?? [];
    /** @type {string[]} */
    const resume = a.resume ?? [];
    const inArgs = args.some((x) => x.includes("{prompt}"));
    return specs.push({
      id: a.id, label: typeof a.label === "string" && a.label.trim() !== "" ? a.label : a.id,
      bins: [a.command], exercised: false, stdin: !inArgs, custom: true,
      about: `declared in ${file}`,
      model: a.model ?? null, models: a.models ?? [], listing: "",
      args: (prompt, { session, extra }) => [
        ...args.map((x) => x.replaceAll("{prompt}", prompt)),
        ...(session ? resume.map((x) => x.replaceAll("{session}", session)) : []),
        ...extra,
      ],
      parse: a.output === "stream-json" ? parseStreamJson : parseText,
    });
  });
  return { specs, errors };
}

/** Every agent the console can start: the catalog, then the person's own. */
export const agentSpecs = (/** @type {NodeJS.ProcessEnv} */ env = process.env) => [...AGENTS, ...customAgents(env).specs];

export const agentById = (/** @type {string} */ id, /** @type {NodeJS.ProcessEnv} */ env = process.env) => agentSpecs(env).find((a) => a.id === id) ?? null;

/** The file a command name resolves to on PATH, or null. */
export function findOnPath(bin, env = process.env, platform = process.platform) {
  const exts = platform === "win32" ? ["", ...String(env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")] : [""];
  for (const dir of String(env.PATH ?? env.Path ?? "").split(path.delimiter)) {
    if (dir === "") continue;
    for (const ext of exts) {
      const file = path.join(dir, bin + ext);
      try {
        if (!statSync(file).isFile()) continue;
        if (platform !== "win32") accessSync(file, constants.X_OK);
        return file;
      } catch { /* not here */ }
    }
  }
  return null;
}

/**
 * Every agent the console knows, installed or not, the one it would use
 * first on top. The order is the person's: `DOCTRINA_AGENT`, then the IDE
 * whose terminal this is, then the adapters the project installed, then the
 * catalog's; what is not installed comes last.
 * @param {{ env?: NodeJS.ProcessEnv, cwd?: string, platform?: NodeJS.Platform }} [opts]
 * @returns {{ id: string, label: string, file: string | null, bins: string[], exercised: boolean, about: string, models: string[], listing: string, takesModel: boolean, custom: boolean }[]}
 */
export function agentCatalog({ env = process.env, cwd = process.cwd(), platform = process.platform } = {}) {
  const pinned = String(env.DOCTRINA_AGENT ?? "").trim().toLowerCase();
  const inCursor = Boolean(env.CURSOR_TRACE_ID) || /cursor/i.test(String(env.VSCODE_GIT_ASKPASS_MAIN ?? ""));
  const hasCursor = isDir(path.join(cwd, ".cursor"));
  const all = agentSpecs(env).map((spec) => {
    // `agent` is too common a name to trust on its own: it counts as Cursor's
    // only where Cursor is in use.
    const bins = spec.id === "cursor" && !(inCursor || hasCursor) ? spec.bins.filter((b) => b !== "agent") : spec.bins;
    const file = bins.map((b) => (/[\\/]/.test(b) ? (isFile(b) ? b : null) : findOnPath(b, env, platform))).find(Boolean) ?? null;
    return { id: spec.id, label: spec.label, file, bins: spec.bins, exercised: spec.exercised, about: spec.about, models: spec.models, listing: spec.listing, takesModel: spec.model !== null, custom: spec.custom === true };
  });
  const rank = (/** @type {{ id: string, file: string | null }} */ a) => {
    if (!a.file) return 9;
    if (a.id === pinned) return 0;
    if (a.id === "cursor" && inCursor) return 1;
    if (a.id === "claude" && env.CLAUDECODE) return 1;
    if (a.id === "cursor" && hasCursor) return 2;
    if (a.id === "claude" && (isDir(path.join(cwd, ".claude")) || isFile(path.join(cwd, "CLAUDE.md")))) return 2;
    if (a.id === "copilot" && isFile(path.join(cwd, ".github", "copilot-instructions.md"))) return 2;
    if (a.id === "gemini" && isFile(path.join(cwd, "GEMINI.md"))) return 2;
    return 3;
  };
  return all.map((a, i) => ({ a, i })).sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i).map((x) => x.a);
}

/**
 * The agents installed on this machine, the one the console would use first.
 * `DOCTRINA_AGENT=none` finds none.
 * @param {{ env?: NodeJS.ProcessEnv, cwd?: string, platform?: NodeJS.Platform }} [opts]
 * @returns {{ id: string, label: string, file: string, exercised: boolean }[]}
 */
export function detectAgents(opts = {}) {
  const pinned = String((opts.env ?? process.env).DOCTRINA_AGENT ?? "").trim().toLowerCase();
  if (pinned === "none" || pinned === "off") return [];
  return agentCatalog(opts).flatMap((a) => (a.file ? [{ id: a.id, label: a.label, file: a.file, exercised: a.exercised }] : []));
}

/** Split DOCTRINA_AGENT_ARGS the way a shell would, quotes included. */
export function splitArgs(text) {
  const out = [];
  let cur = "";
  let quote = "";
  let open = false;
  for (const ch of String(text ?? "")) {
    if (quote) {
      if (ch === quote) quote = "";
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      open = true;
    } else if (/\s/.test(ch)) {
      if (cur !== "" || open) out.push(cur);
      cur = "";
      open = false;
    } else cur += ch;
  }
  if (cur !== "" || open) out.push(cur);
  return out;
}

/**
 * How to start an agent with a prompt: the file, its arguments, and what to
 * write to its stdin. `refused` says why it cannot be started safely.
 * @param {{ id: string, file: string }} agent
 * @param {string} prompt
 * @param {{ session?: string | null, model?: string | null, env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform }} [opts]
 */
export function agentInvocation(agent, prompt, { session = null, model = null, env = process.env, platform = process.platform } = {}) {
  const spec = agentById(agent.id, env);
  if (!spec) return { refused: `unknown agent "${agent.id}"`, file: "", args: /** @type {string[]} */ ([]), stdin: null, shell: false };
  // The model the person chose, the way this agent names one; then their own flags.
  const chosen = model && spec.model ? spec.model.map((x) => x.replaceAll("{model}", model)) : [];
  const extra = [...chosen, ...splitArgs(env.DOCTRINA_AGENT_ARGS)];
  const args = spec.args(prompt, { session, extra });
  // A .cmd launcher only runs through cmd.exe, which would read a prompt as
  // commands. With the prompt on stdin nothing typed reaches it.
  const shim = platform === "win32" && /\.(cmd|bat)$/i.test(agent.file);
  if (shim && !spec.stdin) {
    return { refused: `${spec.label}'s launcher is a ${path.extname(agent.file)} script, and a prompt is not passed through cmd.exe — put its .exe first on PATH`, file: agent.file, args, stdin: null, shell: false };
  }
  return { refused: "", file: agent.file, args, stdin: spec.stdin ? prompt : null, shell: shim };
}

/**
 * The prompt an agent receives: what was typed, where each mentioned
 * artifact lives — so `@spec:auth` is a file the agent opens and not a
 * guess — and what it needs to know about the other consoles: that it may
 * hand one a task, or that this request came from one and its last message
 * is the report.
 * @param {string} text
 * @param {{ kind: string, id: string, path: string }[]} mentions
 * @param {{ peers?: { name: string, busy: boolean, listening: boolean }[], origin?: string | null }} [room]
 */
export function agentPrompt(text, mentions, { peers = [], origin = null } = {}) {
  const named = [];
  for (const m of String(text).matchAll(/(?<![\w@])@([a-z]+):([A-Za-z0-9._-]+)/g)) {
    const hit = mentions.find((x) => x.kind === m[1] && x.id === m[2]);
    if (hit && !named.includes(hit)) named.push(hit);
  }
  let out = text;
  if (named.length > 0) {
    out += `\n\nDoctrina artifacts mentioned above:\n${named.map((m) => `- @${m.kind}:${m.id} — ${m.path}${m.kind === "skill" ? " (a project skill: follow its procedure)" : ""}`).join("\n")}`;
  }
  if (origin) {
    out += `\n\nThis request was sent by the Doctrina console "${origin}", open in another terminal. Do the work here, in this repository; do not hand it to another console. Your last message is sent back to "${origin}" as the report: make it say what you did and what is left.`;
  } else {
    const open = peers.filter((p) => p.listening);
    if (open.length > 0) {
      out += `\n\nOther Doctrina consoles are open in other terminals: ${open.map((p) => `${p.name} (${p.busy ? "busy" : "idle"})`).join(", ")}. `
        + "To hand one a task and wait for its report, run: doctrina ui --send <name> \"<the task, self-contained>\". Its agent works in its own repository; only do that when the task belongs there.";
    }
  }
  return out;
}

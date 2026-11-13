// @ts-check
import path from "node:path";
import { accessSync, constants, statSync } from "node:fs";
import { isDir, isFile } from "./fs-ops.js";

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
 *   | { type: "raw", text: string }} AgentEvent
 */

/**
 * @typedef {{
 *   id: string, label: string, bins: string[], exercised: boolean,
 *   stdin: boolean,
 *   args: (prompt: string, opts: { session: string | null, extra: string[] }) => string[],
 *   parse: (line: string) => AgentEvent[],
 * }} AgentSpec
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
    // The prompt goes in on stdin: no length limit, and nothing a person
    // typed is ever an argument. Edits are accepted and `doctrina` may run —
    // the cycle needs both; every other command still asks, which in print
    // mode means it is refused and reported.
    args: (_prompt, { session, extra }) => ["-p", "--output-format", "stream-json", "--verbose",
      "--permission-mode", "acceptEdits", "--allowedTools", "Bash(doctrina:*)",
      ...(session ? ["--resume", session] : []), ...extra],
    parse: parseStreamJson },
  { id: "cursor", label: "Cursor", bins: ["cursor-agent", "agent"], exercised: false, stdin: false,
    args: (prompt, { session, extra }) => ["-p", "--output-format", "stream-json",
      ...(session ? ["--resume", session] : []), ...extra, prompt],
    parse: parseStreamJson },
  { id: "codex", label: "Codex", bins: ["codex"], exercised: false, stdin: false,
    args: (prompt, { session, extra }) => ["exec", ...(session ? ["resume", session] : []),
      "--json", "--sandbox", "workspace-write", ...extra, prompt],
    parse: parseCodex },
  { id: "gemini", label: "Gemini CLI", bins: ["gemini"], exercised: false, stdin: true,
    args: (_prompt, { extra }) => ["--approval-mode", "auto_edit", ...extra],
    parse: parseText },
];

export const agentById = (/** @type {string} */ id) => AGENTS.find((a) => a.id === id) ?? null;

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
 * The agents installed on this machine, the one the console would use first.
 * The order is the person's: `DOCTRINA_AGENT`, then the IDE whose terminal
 * this is, then the adapters the project installed, then the catalog's.
 * @param {{ env?: NodeJS.ProcessEnv, cwd?: string, platform?: NodeJS.Platform }} [opts]
 * @returns {{ id: string, label: string, file: string, exercised: boolean }[]}
 */
export function detectAgents({ env = process.env, cwd = process.cwd(), platform = process.platform } = {}) {
  const pinned = String(env.DOCTRINA_AGENT ?? "").trim().toLowerCase();
  if (pinned === "none" || pinned === "off") return [];
  const inCursor = Boolean(env.CURSOR_TRACE_ID) || /cursor/i.test(String(env.VSCODE_GIT_ASKPASS_MAIN ?? ""));
  const hasCursor = isDir(path.join(cwd, ".cursor"));
  const found = [];
  for (const spec of AGENTS) {
    // `agent` is too common a name to trust on its own: it counts as Cursor's
    // only where Cursor is in use.
    const bins = spec.id === "cursor" && !(inCursor || hasCursor) ? spec.bins.filter((b) => b !== "agent") : spec.bins;
    const file = bins.map((b) => findOnPath(b, env, platform)).find(Boolean);
    if (file) found.push({ id: spec.id, label: spec.label, file, exercised: spec.exercised });
  }
  const rank = (/** @type {{ id: string }} */ a) => {
    if (a.id === pinned) return 0;
    if (a.id === "cursor" && inCursor) return 1;
    if (a.id === "claude" && env.CLAUDECODE) return 1;
    if (a.id === "cursor" && hasCursor) return 2;
    if (a.id === "claude" && (isDir(path.join(cwd, ".claude")) || isFile(path.join(cwd, "CLAUDE.md")))) return 2;
    return 3;
  };
  return found.sort((a, b) => rank(a) - rank(b));
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
 * @param {{ session?: string | null, env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform }} [opts]
 */
export function agentInvocation(agent, prompt, { session = null, env = process.env, platform = process.platform } = {}) {
  const spec = agentById(agent.id);
  if (!spec) return { refused: `unknown agent "${agent.id}"`, file: "", args: /** @type {string[]} */ ([]), stdin: null, shell: false };
  const extra = splitArgs(env.DOCTRINA_AGENT_ARGS);
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
 * The prompt an agent receives: what was typed, and where each mentioned
 * artifact lives, so `@spec:auth` is a file the agent opens and not a guess.
 * @param {string} text
 * @param {{ kind: string, id: string, path: string }[]} mentions
 */
export function agentPrompt(text, mentions) {
  const named = [];
  for (const m of String(text).matchAll(/(?<![\w@])@([a-z]+):([A-Za-z0-9._-]+)/g)) {
    const hit = mentions.find((x) => x.kind === m[1] && x.id === m[2]);
    if (hit && !named.includes(hit)) named.push(hit);
  }
  if (named.length === 0) return text;
  return `${text}\n\nDoctrina artifacts mentioned above:\n${named.map((m) => `- @${m.kind}:${m.id} — ${m.path}${m.kind === "skill" ? " (a project skill: follow its procedure)" : ""}`).join("\n")}`;
}

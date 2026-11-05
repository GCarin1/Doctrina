// @ts-check

// The TOOLS a workspace declares (change 0223, ADR 0031): which MCP server
// each tool is, what it is for, which agent role may use it, and whether it
// may WRITE. Doctrina never calls a tool. It writes the declaration where
// the agent reads it, and answers the agent's own pre-call hook — Cursor's
// `beforeMCPExecution`, Claude Code's `PreToolUse` — so "read-only unless
// declared otherwise" is enforced by the agent, not hoped for.

export const TOOL_ACCESS = ["read", "write"];
export const AGENT_ROLES = ["planner", "executor", "qa", "observer", "reviewer"];
export const TOOL_NAME = /^[a-z][a-z0-9-]*$/;

// Presets for the tools a delivery usually reads. `server` is the key the
// operator gave the MCP server in the agent's own configuration; a preset
// is a default, and every field can be overridden.
export const TOOL_PRESETS = {
  jira: { server: "atlassian", for: ["planner"], purpose: "the story, its acceptance criteria and status" },
  confluence: { server: "atlassian", for: ["planner"], purpose: "the documentation the story points at" },
  figma: { server: "figma", for: ["planner", "qa"], purpose: "the design of the screen: frames, tokens, screenshots" },
  playwright: { server: "playwright", for: ["qa"], purpose: "browse the running app, capture what the tests need" },
  datadog: { server: "datadog", for: ["observer"], purpose: "logs, metrics, traces and monitors after the release" },
  databricks: { server: "databricks", for: ["planner", "qa"], purpose: "queries on the data the feature reads or writes" },
  sql: { server: "sql", for: ["planner", "qa"], purpose: "queries on the database the feature reads or writes" },
};

/** A tool entry from flags and an optional preset. Throws a message on bad input. */
export function toolEntry(name, opts, existing = null) {
  if (!TOOL_NAME.test(name)) throw new Error(`tool name "${name}" must match ${TOOL_NAME}`);
  const preset = TOOL_PRESETS[name] ?? {};
  const base = existing ?? { name, server: preset.server ?? null, access: "read", for: preset.for ?? [], purpose: preset.purpose ?? "" };
  const entry = { ...base };
  if (opts.server) entry.server = opts.server;
  if (opts.access) {
    if (!TOOL_ACCESS.includes(opts.access)) throw new Error(`--access must be one of ${TOOL_ACCESS.join(", ")} (got "${opts.access}")`);
    entry.access = opts.access;
  }
  if (opts.for) {
    const roles = opts.for.split(",").map((s) => s.trim()).filter(Boolean);
    const bad = roles.filter((r) => !AGENT_ROLES.includes(r));
    if (bad.length) throw new Error(`--for names unknown role(s) ${bad.join(", ")} — roles: ${AGENT_ROLES.join(", ")}`);
    entry.for = roles;
  }
  if (opts.purpose) entry.purpose = opts.purpose;
  if (!entry.server) throw new Error(`tool "${name}" has no preset — pass --server <the MCP server's name in your agent's config>`);
  return entry;
}

// Verbs that change state in the system a tool talks to. Matched on the
// tool's own name, word by word.
const WRITE_VERBS = new Set([
  "create", "update", "edit", "delete", "remove", "add", "write", "post", "put", "patch", "send",
  "transition", "assign", "comment", "publish", "upload", "deploy", "trigger", "set", "move",
  "merge", "close", "archive", "insert", "drop", "alter", "truncate", "mutate", "rollback", "restart",
  "approve", "reject", "resolve", "mute", "unmute", "schedule", "cancel", "import",
  // The fourth audit (change 0235): verbs real MCP servers use that passed as reads.
  "upsert", "link", "unlink", "reopen", "rename", "replace", "save", "submit", "sync", "release",
  "rotate", "grant", "revoke", "reset", "clear", "purge", "destroy", "terminate", "kill", "pause",
  "enable", "disable", "snooze", "escalate", "notify", "reply", "react", "vote", "fork", "push",
  "commit", "lock", "unlock", "ack", "acknowledge", "install", "uninstall", "provision", "scale",
  "rerun", "retry", "dispatch", "copy", "duplicate", "invite", "share", "subscribe", "unsubscribe",
  "block", "unblock", "revert", "restore", "empty",
]);
// Statements that change the database, a procedure that may, and a SELECT
// that writes a table (`SELECT … INTO`). A keyword in a comment counts: the
// guard errs on the side of asking.
const MUTATING_SQL = /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|replace|call|exec|execute|copy|do|vacuum|reindex|cluster|refresh|upsert|load|unload|optimize|restore|rename|comment|lock|into)\b/i;
const SQL_START = /^\s*(\(|\/\*|--)?\s*(select|with|insert|update|delete|merge|drop|alter|create|truncate|show|describe|explain|call|exec|execute|copy|grant|revoke|vacuum|refresh|optimize|do)\b/i;
// An argument that names the operation a generic tool performs.
const ACTION_KEYS = new Set(["action", "operation", "op", "method", "verb", "mutation"]);

/**
 * Whether a tool call would change state. A SQL statement in the input
 * decides for itself; otherwise the tool's name does.
 */
export function isWriteCall(toolName, toolInput) {
  const input = parsed(toolInput);
  // An argument that says what a generic tool does: `{ action: "delete" }`,
  // `{ method: "POST" }`, a GraphQL `mutation` (change 0235).
  if (actionWrites(input)) return true;
  const sql = sqlIn(input);
  if (sql !== null) return MUTATING_SQL.test(sql.replace(/'[^']*'/g, "''"));
  // camelCase and snake_case alike: `transitionJiraIssue`, `transition_issue`.
  const words = nameWords(toolName);
  if (words.some((w) => WRITE_VERBS.has(w))) return true;
  // A name with no separator at all — `createissue`, `CREATEISSUE`,
  // `getandremove` — hides its verbs inside one word (change 0235).
  if (words.length === 1 && words[0].length > 6) {
    return [...WRITE_VERBS].some((v) => v.length >= 5 && words[0].includes(v));
  }
  return false;
}

function nameWords(name) {
  return String(name).replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

function parsed(input) {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

/** Every string inside an input, to a bounded depth. */
function stringsIn(value, depth = 0, out = /** @type {Array<{ key: string, value: string }>} */ ([]), key = "") {
  if (depth > 5 || out.length > 200) return out;
  if (typeof value === "string") out.push({ key, value });
  else if (Array.isArray(value)) for (const v of value) stringsIn(v, depth + 1, out, key);
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) stringsIn(v, depth + 1, out, k);
  return out;
}

function actionWrites(input) {
  for (const { key, value } of stringsIn(input)) {
    if (/^\s*mutation\b/i.test(value)) return true;
    if (!ACTION_KEYS.has(key.toLowerCase())) continue;
    const words = nameWords(value);
    if (words.some((w) => WRITE_VERBS.has(w) || ["post", "put", "patch", "delete"].includes(w))) return true;
  }
  return false;
}

// SQL wherever the input carries it — `sql`, `query`, `q`, a `statements`
// list, a nested `{ input: { sql } }` (change 0235): only four top-level
// keys were read, and a DELETE under any other passed as no SQL at all.
function sqlIn(input) {
  const found = stringsIn(input).map((s) => s.value).filter((s) => SQL_START.test(s));
  return found.length ? found.join(";\n") : null;
}

/**
 * The guard's answer for one MCP call. `server` is the MCP server's name;
 * `tool` the tool's own name. Unknown servers get no opinion — the guard
 * governs what the workspace declares, never the operator's other tools.
 * @returns {{ decision: "allow"|"deny"|"ask"|"none", reason: string }}
 */
export function guardDecision(tools, server, tool, input) {
  const declared = tools.filter((t) => t.server === server && t.enabled !== false);
  if (declared.length === 0) return { decision: "none", reason: `server "${server}" is not declared in the workspace` };
  const write = isWriteCall(tool, input);
  if (!write) return { decision: "allow", reason: `${tool} reads` };
  const writable = declared.some((t) => t.access === "write");
  const names = declared.map((t) => t.name).join(", ");
  if (!writable) {
    return {
      decision: "deny",
      reason: `${tool} would change state through "${server}", which the workspace declares read-only (${names}). Ask the human; to allow writes: doctrina workspace tool ${declared[0].name} --access write`,
    };
  }
  return { decision: "ask", reason: `${tool} would change state through "${server}" (${names}, declared read/write) — the human approves each write` };
}

/** `mcp__<server>__<tool>` (Claude Code's tool naming) split, or null. */
export function splitClaudeToolName(name) {
  const m = String(name).match(/^mcp__(.+?)__(.+)$/);
  return m ? { server: m[1], tool: m[2] } : null;
}

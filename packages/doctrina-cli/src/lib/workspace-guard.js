// @ts-check
import { readFileSync } from "node:fs";
import process from "node:process";
import { c } from "./colors.js";
import { EXIT } from "./exit-codes.js";
import { findWorkspace, readWorkspace } from "./workspace-locate.js";
import { guardDecision, splitClaudeToolName } from "./workspace-tools.js";

// `doctrina workspace guard --hook cursor|claude` — the pre-call hook an
// agent runs before EVERY MCP call (ADR 0031). It lives apart from the rest
// of `workspace`, in lib/ so the entrypoint and the `workspace` command share
// one door, and the entrypoint routes to it directly (fifth audit, change
// 0236), so a call pays for the guard and not for the whole CLI. It is an
// I/O adapter — stdin in, the agent's JSON out — around guardDecision.

/** Run the guard from the current directory. */
export function runGuard(hook) {
  return workspaceGuard(findWorkspace(process.cwd())?.dir ?? null, hook);
}

export function workspaceGuard(wsDir, hook) {
  if (hook !== "cursor" && hook !== "claude") {
    console.error(c.red("error:") + ` --hook needs cursor or claude (got "${hook ?? ""}")`);
    return EXIT.USAGE;
  }
  let call = {};
  try {
    call = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    call = {};
  }
  let server = null;
  let tool = null;
  if (hook === "cursor") {
    server = call.mcp_server_name ?? null;
    tool = call.tool_name ?? null;
  } else {
    const split = splitClaudeToolName(call.tool_name ?? "");
    if (split) ({ server, tool } = split);
  }
  const tools = wsDir ? readWorkspace(wsDir).tools : [];
  const verdict = server && tool ? guardDecision(tools, server, tool, call.tool_input) : { decision: "none", reason: "" };
  if (hook === "cursor") {
    const permission = verdict.decision === "none" ? "allow" : verdict.decision;
    const out = { permission };
    if (permission !== "allow") Object.assign(out, { user_message: verdict.reason, agent_message: verdict.reason });
    console.log(JSON.stringify(out));
  } else if (verdict.decision !== "none") {
    console.log(JSON.stringify({ hookSpecificOutput: {
      hookEventName: "PreToolUse", permissionDecision: verdict.decision, permissionDecisionReason: verdict.reason,
    } }));
  }
  return EXIT.OK;
}

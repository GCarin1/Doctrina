// @ts-check
import process from "node:process";
import { relPath, write } from "../lib/fs-ops.js";
import { flagString } from "../lib/args.js";
import { c } from "../lib/colors.js";
import { suggest } from "../lib/suggest.js";
import { today } from "../lib/dates.js";
import { EXIT, PreconditionError } from "../lib/exit-codes.js";
import { readTemplate, substitute } from "../lib/templates.js";
import { renderPlaybook } from "../lib/playbook.js";
import { findWorkspace, readWorkspace } from "../lib/workspace.js";
import {
  deliveryBlockers, deliveryChanges, deliveryPath, dependencyOrder, listDeliveries, nextDeliveryId,
  rankProjects, readDelivery, resolveDeliveryId, setDeliveryHeader, daysBetween, recordBlockers,
} from "../lib/delivery.js";

// `doctrina delivery` — one item of work across repositories (ADR 0030).
// Decisions in lib/delivery.js; this module renders them.

const SUBCOMMANDS = ["new", "route", "list", "status", "check", "close"];

export const flags = { boolean: ["json"], string: ["ref", "projects", "date"] };

export async function run(positional, flags) {
  const sub = positional[0];
  if (!SUBCOMMANDS.includes(sub)) {
    console.error(c.red("error:") + ` unknown delivery subcommand "${sub ?? ""}"`);
    const guess = suggest(sub, SUBCOMMANDS);
    console.error(c.gray("hint: ") + (guess ? `did you mean \`doctrina delivery ${guess}\`?` : `available: ${SUBCOMMANDS.join(", ")}`));
    return EXIT.USAGE;
  }
  const found = findWorkspace(process.cwd());
  if (!found) {
    throw new PreconditionError("a delivery lives in a workspace, and none was found here", "doctrina workspace init <dir>");
  }
  const wsDir = found.dir;
  const ws = readWorkspace(wsDir);
  if (sub === "new") return deliveryNew(wsDir, ws, positional.slice(1).join(" ").trim(), flags);
  if (sub === "list") return deliveryList(wsDir, ws);
  const id = resolveDeliveryId(wsDir, positional[1]);
  if (!id) {
    console.error(c.red("error:") + ` no delivery "${positional[1] ?? ""}" in this workspace`);
    console.error(c.gray("hint: ") + "`doctrina delivery list` shows them");
    return EXIT.USAGE;
  }
  if (sub === "route") return deliveryRoute(wsDir, ws, id, positional[2] ?? flagString(flags, "projects"));
  if (sub === "status") return deliveryStatus(wsDir, ws, id);
  if (sub === "check") return deliveryCheck(wsDir, ws, id);
  return deliveryClose(wsDir, ws, id, flags);
}

function parseProjects(ws, raw) {
  const names = String(raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = names.filter((n) => !ws.projects.some((p) => p.name === n));
  return { names, unknown };
}

function deliveryNew(wsDir, ws, title, flags) {
  if (!title) {
    console.error(c.red("error:") + " delivery new needs a title");
    console.error(c.gray("hint: ") + 'doctrina delivery new "Login screen" --ref SHOP-123');
    return EXIT.USAGE;
  }
  if (ws.projects.length === 0) {
    throw new PreconditionError("the workspace has no project to deliver into", "doctrina workspace add <path>");
  }
  const { names, unknown } = parseProjects(ws, flagString(flags, "projects"));
  if (unknown.length > 0) {
    console.error(c.red("error:") + ` --projects names no registered project: ${unknown.join(", ")}`);
    return EXIT.USAGE;
  }
  const id = nextDeliveryId(wsDir, title);
  const ref = flagString(flags, "ref") ?? "—";
  const ordered = dependencyOrder(ws, names);
  const tpl = readTemplate(wsDir, "delivery.md.template");
  const file = deliveryPath(wsDir, id);
  write(file, substitute(tpl.body, {
    DELIVERY_ID: id, DELIVERY_TITLE: title, DATE: flagString(flags, "date") ?? today(),
    DELIVERY_REF: ref, DELIVERY_PROJECTS: ordered.length ? ordered.join(", ") : "—",
  }));
  console.log(c.green("created") + ` ${relPath(wsDir, file)}`);
  console.log("");
  console.log(renderPlaybook(wsDir, "delivery", playbookTokens(wsDir, ws, readDelivery(wsDir, id))));
  return EXIT.OK;
}

function playbookTokens(wsDir, ws, delivery) {
  const ranked = rankProjects(wsDir, ws, `${delivery.title} ${delivery.ref}`);
  const routing = delivery.projects.length > 0
    ? `       routed: ${dependencyOrder(ws, delivery.projects).join(" → ")} — route again to change it`
    : ranked.map(({ project, score, shared }) =>
      `       ${c.cyan(project.name.padEnd(16))} ${score > 0 ? `shares ${shared.join(", ")}` : c.gray("no shared term")}`
      + c.gray(` · ${project.role || "no role"}${project.dependsOn?.length ? ` · depends on ${project.dependsOn.join(", ")}` : ""}`)).join("\n");
  const tools = ws.tools.filter((t) => t.enabled !== false);
  return {
    DELIVERY_ID: delivery.id,
    DELIVERY_TITLE: delivery.title,
    DELIVERY_REF: delivery.ref === "—" ? "(no --ref given: ask the human which item this is)" : delivery.ref,
    DELIVERY_FILE: relPath(wsDir, deliveryPath(wsDir, delivery.id)),
    ROUTING: routing,
    TOOLS: tools.length === 0 ? "" : "   Tools this workspace declares:\n" + tools.map((t) =>
      `       ${c.cyan(t.name.padEnd(12))} ${t.access === "write" ? "read/write (writes need the human)" : "read-only"} — ${t.purpose || t.server}`).join("\n"),
  };
}

function deliveryRoute(wsDir, ws, id, raw) {
  const { names, unknown } = parseProjects(ws, raw);
  if (names.length === 0) {
    console.error(c.red("error:") + " delivery route needs the projects, comma-separated");
    console.error(c.gray("hint: ") + `doctrina delivery route ${id} back-end,front-core`);
    return EXIT.USAGE;
  }
  if (unknown.length > 0) {
    console.error(c.red("error:") + ` no registered project named ${unknown.join(", ")}`);
    return EXIT.USAGE;
  }
  const ordered = dependencyOrder(ws, names);
  setDeliveryHeader(wsDir, id, "Projects", ordered.join(", "));
  const d = readDelivery(wsDir, id);
  console.log(c.green("routed") + ` ${id} → ${ordered.join(" → ")}` + c.gray(" (dependencies first)"));
  console.log("");
  console.log("Open one change in each, in this order:");
  for (const name of ordered) {
    const p = ws.projects.find((x) => x.name === name);
    console.log("  " + c.cyan(`cd ${p?.path} && doctrina work "${d.title}" --delivery ${id}`));
  }
  return EXIT.OK;
}

function deliveryList(wsDir, ws) {
  const all = listDeliveries(wsDir);
  if (all.length === 0) {
    console.log(c.gray("no delivery yet — `doctrina delivery new \"<title>\" --ref <tracker-id>`"));
    return EXIT.OK;
  }
  for (const d of all) {
    const rows = deliveryChanges(wsDir, ws, d);
    const changes = rows.flatMap((r) => r.changes);
    const closed = changes.filter((ch) => ch.archived).length;
    const colour = d.status === "closed" ? c.green : c.yellow;
    const days = daysBetween(d.date, d.status === "closed" ? d.closed : today());
    const age = days === null ? "" : d.status === "closed" ? `, lead time ${days}d` : `, open ${days}d`;
    console.log(`  ${c.cyan(d.id.padEnd(30))} ${colour(d.status.padEnd(7))} ${d.ref.padEnd(12)} ${d.projects.join(", ") || "—"}` +
      c.gray(`  ${closed}/${changes.length} changes closed${age}`));
  }
  const leads = all.filter((d) => d.status === "closed").map((d) => daysBetween(d.date, d.closed)).filter((n) => n !== null).sort((a, b) => a - b);
  if (leads.length > 0) {
    console.log("");
    console.log(c.gray(`${leads.length} closed · median lead time ${leads[Math.floor((leads.length - 1) / 2)]}d · longest ${leads[leads.length - 1]}d`));
  }
  return EXIT.OK;
}

function deliveryStatus(wsDir, ws, id) {
  const d = readDelivery(wsDir, id);
  console.log(c.bold(`Delivery ${d.id}`) + ` — ${d.title}` + c.gray(` (${d.status}, ref ${d.ref}, opened ${d.date ?? "?"})`));
  console.log("");
  for (const row of deliveryChanges(wsDir, ws, d)) {
    console.log(`  ${c.cyan(row.project)}${row.path ? c.gray(" " + row.path) : ""}`);
    if (row.missing) console.log(c.red(`    ${row.missing}`));
    else if (row.changes.length === 0) console.log(c.yellow("    no change yet") + c.gray(` — cd ${row.path} && doctrina work "${d.title}" --delivery ${d.id}`));
    for (const ch of row.changes) {
      const colour = ch.archived ? c.green : c.yellow;
      console.log(`    ${colour(ch.status.padEnd(9))} ${ch.id}` + c.gray(`  tasks ${ch.tasksDone}/${ch.tasksTotal}`));
    }
  }
  const record = recordBlockers(d);
  if (record.length > 0) {
    console.log(`  ${c.cyan("record")}`);
    for (const r of record) console.log(c.yellow("    ") + r);
  }
  const blockers = deliveryBlockers(wsDir, ws, d);
  console.log("");
  console.log(blockers.length === 0
    ? c.green("ready to close") + ` — doctrina delivery close ${d.id}`
    : c.gray(`${blockers.length} thing${blockers.length === 1 ? "" : "s"} before the close — doctrina delivery check ${d.id}`));
  return EXIT.OK;
}

function deliveryCheck(wsDir, ws, id) {
  const d = readDelivery(wsDir, id);
  const blockers = deliveryBlockers(wsDir, ws, d);
  if (blockers.length === 0) {
    console.log(c.green("ok") + ` ${id} is ready to close: doctrina delivery close ${id}`);
    return EXIT.OK;
  }
  for (const b of blockers) console.log(c.red("✗ ") + b);
  console.log("");
  console.log(c.red("fail") + ` ${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`);
  return EXIT.GATE;
}

function deliveryClose(wsDir, ws, id, flags) {
  const d = readDelivery(wsDir, id);
  if (d.status === "closed") {
    console.log(c.gray(`${id} is already closed (${d.closed ?? "?"})`));
    return EXIT.OK;
  }
  if (deliveryCheck(wsDir, ws, id) !== EXIT.OK) return EXIT.GATE;
  const date = flagString(flags, "date") ?? today();
  setDeliveryHeader(wsDir, id, "Status", "closed");
  setDeliveryHeader(wsDir, id, "Closed", date);
  console.log(c.green("closed") + ` ${id}`);
  console.log(`Tell the human: delivery ${id} is closed — ${d.projects.length} project${d.projects.length === 1 ? "" : "s"} (${d.projects.join(", ")}); record at ${relPath(wsDir, deliveryPath(wsDir, id))}. Commit the workspace.`);
  return EXIT.OK;
}

export const help = `
Usage: doctrina delivery <new|route|list|status|check|close> [options]

One item of work across repositories (ADR 0030) — a story, a screen, a fix.
It lives in the workspace's deliveries/ and holds what no single repository
owns. Each project it touches gets ONE change, opened there with
\`doctrina work "<title>" --delivery <id>\`; the delivery's state is read
from those changes, never copied into it.

  new "<title>" [--ref <tracker-id>] [--projects <a,b>]
      Create deliveries/<NNNN-slug>/delivery.md and print the orchestration
      playbook: read the story, route, open one change per repository,
      delegate the task cards, close each change, release, watch, close.
      Without --projects it ranks the workspace's projects against the title.
  route <id> <a,b>
      Set the projects (dependencies first) and print the \`work\` line for each.
  list
      Every delivery with its status, ref, closed/total changes and age —
      lead time once closed, with the median over the closed ones.
  status <id>
      Per project: the changes carrying this delivery, their state and tasks.
  check <id>
      Exit 1 while a routed project has no change for it or one still open,
      while ## Story is empty, a ## Release box is unticked, or
      ## Observability records nothing.
  close <id>
      The check, then Status: closed and the Closed date.

<id> is the folder name or its number (\`1\`, \`0001\`).
`;


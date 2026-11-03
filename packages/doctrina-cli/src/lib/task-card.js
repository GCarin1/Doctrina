// @ts-check
import path from "node:path";
import { isFile, read } from "./fs-ops.js";
import { parseChangeTitle, parseChecklist } from "./doc-model.js";
import { listHeader, deltaCapabilities } from "./scan.js";
import { sliceSpec } from "./context-slice.js";
import { terms } from "./lexicon.js";

// A TASK CARD (change 0222, ADR 0030): one task of a change, carrying what
// an executor needs to do it ALONE — the task, the lines indented under it
// (files, requirement, verify command), why the change exists, and the spec
// cut to the task. A subagent does not see the planner's conversation, so
// the card is the whole of its context; a card that needs the conversation
// is a card the planner has not finished writing.

/**
 * The tasks.md boxes, each with the indented lines under it.
 * Ordinals are the same ones `change tick` uses (tasks.md comes first).
 */
export function taskBoxes(tasksText) {
  const lines = String(tasksText).replace(/\r\n/g, "\n").split("\n");
  return parseChecklist(tasksText).map((box, i) => {
    const indent = (lines[box.line].match(/^\s*/)?.[0] ?? "").length;
    const details = [];
    for (let j = box.line + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "") {
        if (details.length) break;
        continue;
      }
      if ((l.match(/^\s*/)?.[0] ?? "").length <= indent) break;
      details.push(l.trim().replace(/^[-*]\s+/, ""));
    }
    return { ordinal: i + 1, text: box.text, checked: box.checked, placeholder: box.placeholder, details };
  });
}

/** The `Field: value` lines of a card's details, keyed by lowercased field. */
export function cardFields(details) {
  const out = {};
  for (const d of details) {
    const m = d.match(/^([A-Za-z][A-Za-z ]{0,20}):\s*(.+)$/);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

function firstParagraph(text, heading) {
  const m = String(text).match(new RegExp(`^## ${heading}\\s*\\n+([\\s\\S]*?)(?:\\n\\s*\\n|\\n## |$)`, "m"));
  return m ? m[1].replace(/<!--[\s\S]*?-->/g, "").trim() : "";
}

/**
 * The card for task `ordinal` of a change — or, with no ordinal, the first
 * open one. Null `card` with a reason when there is none to give.
 * @returns {{ card: null, reason: string } | { card: object, reason: null }}
 */
export function taskCard(projectRoot, changeId, ordinal = null) {
  const changeDir = path.join(projectRoot, ".doctrina", "changes", changeId);
  const tasksPath = path.join(changeDir, "tasks.md");
  if (!isFile(tasksPath)) return { card: null, reason: "the change has no tasks.md" };
  const boxes = taskBoxes(read(tasksPath));
  if (boxes.length === 0) return { card: null, reason: "tasks.md has no task box" };
  let box;
  if (ordinal === null) {
    box = boxes.find((b) => !b.checked && !b.placeholder);
    if (!box) return { card: null, reason: "every task is ticked — the change is ready for review and close" };
  } else {
    box = boxes.find((b) => b.ordinal === ordinal);
    if (!box) return { card: null, reason: `no task ${ordinal} (tasks.md has ${boxes.length})` };
  }
  if (box.placeholder) return { card: null, reason: `task ${box.ordinal} is a scaffold placeholder — write the task first` };
  // CRLF on a Windows checkout: the Why is read paragraph by paragraph.
  const proposal = isFile(path.join(changeDir, "proposal.md")) ? read(path.join(changeDir, "proposal.md")).replace(/\r\n/g, "\n") : "";
  const fields = cardFields(box.details);
  const query = terms([box.text, ...box.details].join(" "));
  const slices = [];
  for (const cap of deltaCapabilities(changeDir)) {
    const rel = `.doctrina/specs/${cap}/spec.md`;
    const specPath = path.join(projectRoot, rel);
    if (!isFile(specPath)) continue;
    const slice = sliceSpec(read(specPath), query, rel);
    if (slice) slices.push({ capability: cap, ...slice });
  }
  return {
    card: {
      change: changeId,
      title: parseChangeTitle(proposal) ?? changeId,
      delivery: listHeader(proposal, "Delivery") ?? null,
      ordinal: box.ordinal,
      total: boxes.length,
      done: boxes.filter((b) => b.checked).length,
      checked: box.checked,
      text: box.text,
      details: box.details,
      fields,
      why: firstParagraph(proposal, "Why"),
      slices,
    },
    reason: null,
  };
}

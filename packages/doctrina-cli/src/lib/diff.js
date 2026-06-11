// Minimal line diff (LCS-based) for `change diff`. Specs are capped at a
// few hundred lines, so the O(n*m) table is fine and keeps us at zero deps.

export function diffLines(aText, bText) {
  const a = splitLines(aText);
  const b = splitLines(bText);
  const n = a.length;
  const m = b.length;

  // LCS length table.
  const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  // Backtrack into a flat op list.
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ type: "del", text: a[i] });
      i += 1;
    } else {
      ops.push({ type: "add", text: b[j] });
      j += 1;
    }
  }
  while (i < n) ops.push({ type: "del", text: a[i++] });
  while (j < m) ops.push({ type: "add", text: b[j++] });
  return ops;
}

// Render ops as unified-style hunks with `context` lines around changes.
export function formatUnified(ops, { context = 3, aLabel = "a", bLabel = "b" } = {}) {
  const out = [`--- ${aLabel}`, `+++ ${bLabel}`];
  const hunks = collectHunks(ops, context);
  let aLine = 1;
  let bLine = 1;
  let cursor = 0;
  for (const [start, end] of hunks) {
    // Advance line counters across the skipped region.
    for (; cursor < start; cursor++) {
      if (ops[cursor].type !== "add") aLine += 1;
      if (ops[cursor].type !== "del") bLine += 1;
    }
    let aLen = 0;
    let bLen = 0;
    for (let k = start; k < end; k++) {
      if (ops[k].type !== "add") aLen += 1;
      if (ops[k].type !== "del") bLen += 1;
    }
    out.push(`@@ -${aLine},${aLen} +${bLine},${bLen} @@`);
    for (; cursor < end; cursor++) {
      const op = ops[cursor];
      const prefix = op.type === "add" ? "+" : op.type === "del" ? "-" : " ";
      out.push(prefix + op.text);
      if (op.type !== "add") aLine += 1;
      if (op.type !== "del") bLine += 1;
    }
  }
  if (hunks.length === 0) out.push("(no differences)");
  return out.join("\n");
}

function collectHunks(ops, context) {
  // Indices of changed ops.
  const changed = [];
  for (let k = 0; k < ops.length; k++) {
    if (ops[k].type !== "same") changed.push(k);
  }
  if (changed.length === 0) return [];
  const hunks = [];
  let start = Math.max(0, changed[0] - context);
  let end = Math.min(ops.length, changed[0] + context + 1);
  for (let c = 1; c < changed.length; c++) {
    const k = changed[c];
    if (k - context <= end) {
      end = Math.min(ops.length, k + context + 1);
    } else {
      hunks.push([start, end]);
      start = Math.max(0, k - context);
      end = Math.min(ops.length, k + context + 1);
    }
  }
  hunks.push([start, end]);
  return hunks;
}

function splitLines(text) {
  const lines = text.split("\n");
  // Drop a single trailing empty line produced by a final newline.
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

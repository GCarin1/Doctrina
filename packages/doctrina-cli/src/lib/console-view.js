// @ts-check
import { paletteOf } from "./console-model.js";

// THE CONSOLE, AS A SCREEN (change 0257).
//
// One function turns the state into the lines of a frame and the place the
// cursor sits. It writes nothing: the command module paints what this
// returns, and the tests read it.
//
// The layout is the project's own shape. The gates run across the top,
// because they are what every command ends on; the conversation is the
// body; the panel beside it is the tree — what is open, at which stage,
// and the next step — and the line a human types on is at the bottom, where
// a terminal has always had it. Narrower than 84 columns the panel folds
// into one strip under the gates, so a split pane or a phone still works.

/** @typedef {import("./console-model.js").State} State */
/** @typedef {import("./console-model.js").Entry} Entry */
/** @typedef {{ t: string, s?: string }} Seg   text and a style name */

const STYLES = /** @type {Record<string, string>} */ ({
  brand: "38;5;179", brandBold: "1;38;5;179", bold: "1", dim: "2", gray: "90",
  cyan: "36", green: "32", yellow: "33", red: "31", inverse: "7", selected: "1;38;5;179",
});
// Every glyph the console draws is one a plain monospace font carries: box
// drawing, ◆ ● ○ ■ □ ►. The spinner is braille where the terminal's font
// has it, and four ASCII strokes in the legacy Windows console.
const SPINNER = process.platform === "win32" && !process.env.WT_SESSION
  ? ["-", "\\", "|", "/"]
  : ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const PALETTE_ROWS = 8;
const INPUT_ROWS = 4;

/** Columns a character takes: 0 for a combining mark, 2 for wide East Asian and emoji. */
function charWidth(ch) {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp === 0x200d || (cp >= 0x300 && cp <= 0x36f) || (cp >= 0xfe00 && cp <= 0xfe0f)) return 0;
  if ((cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe6f) || (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff) || (cp >= 0x20000 && cp <= 0x3fffd)) return 2;
  return 1;
}

/** The columns a plain string takes. */
export function textWidth(s) {
  let w = 0;
  for (const ch of String(s)) w += charWidth(ch);
  return w;
}

const segsWidth = (/** @type {Seg[]} */ segs) => segs.reduce((n, g) => n + textWidth(g.t), 0);

/** Cut segments to `width` columns (an ellipsis marks the cut) and pad to it. */
function fit(segs, width, color) {
  let left = width;
  let out = "";
  const total = segsWidth(segs);
  for (const g of segs) {
    if (left <= 0) break;
    let t = "";
    let w = 0;
    for (const ch of g.t) {
      const cw = charWidth(ch);
      if (w + cw > left) break;
      t += ch;
      w += cw;
    }
    if (total > width && w === left && w > 0) {
      // The last column of a cut line is the ellipsis.
      const chars = Array.from(t);
      let drop = 0;
      while (chars.length > 0 && drop < 1) drop += charWidth(chars.pop() ?? "");
      t = `${chars.join("")}…${" ".repeat(Math.max(0, drop - 1))}`;
    }
    left -= w;
    out += color && g.s && STYLES[g.s] ? `\x1b[${STYLES[g.s]}m${t}\x1b[0m` : t;
  }
  return out + " ".repeat(Math.max(0, left));
}

/**
 * Wrap segments at word boundaries. A word longer than the line is split.
 * @param {Seg[]} segs
 * @param {number} width
 * @param {{ first?: Seg[], rest?: Seg[] }} [lead]  what each line starts with
 * @returns {Seg[][]}
 */
function wrap(segs, width, { first = [], rest = [] } = {}) {
  /** @type {Seg[][]} */
  const lines = [];
  let line = [...first];
  let used = segsWidth(first);
  const lead = segsWidth(rest);
  const room = Math.max(4, width - lead);
  const newline = () => {
    lines.push(line);
    line = [...rest];
    used = lead;
  };
  for (const g of segs) {
    for (const token of g.t.split(/(\s+)/)) {
      if (token === "") continue;
      const w = textWidth(token);
      if (/^\s+$/.test(token)) {
        // Kept even when it lands on the last column: the word after it then
        // starts the next line instead of joining this one.
        if (used > (lines.length === 0 ? segsWidth(first) : lead) && used + w <= width) {
          line.push({ t: token, s: g.s });
          used += w;
        }
        continue;
      }
      if (used + w > width && used > (lines.length === 0 ? segsWidth(first) : lead)) newline();
      if (w <= room) {
        line.push({ t: token, s: g.s });
        used += w;
        continue;
      }
      // Longer than a line: cut it, after a hyphen or a slash where one is near.
      let piece = "";
      let pw = 0;
      for (const ch of token) {
        const cw = charWidth(ch);
        if (used + pw + cw > width) {
          const soft = Math.max(piece.lastIndexOf("-"), piece.lastIndexOf("/"), piece.lastIndexOf("_"));
          const keep = soft >= piece.length - 14 && soft > 0 ? piece.slice(0, soft + 1) : piece;
          const carry = piece.slice(keep.length);
          line.push({ t: keep, s: g.s });
          newline();
          piece = carry;
          pw = textWidth(carry);
        }
        piece += ch;
        pw += cw;
      }
      line.push({ t: piece, s: g.s });
      used += pw;
    }
  }
  lines.push(line);
  return lines;
}

/** `**bold**` and `` `code` `` in what an agent wrote. */
function inline(text, base) {
  /** @type {Seg[]} */
  const out = [];
  let rest = String(text);
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/;
  while (rest !== "") {
    const m = re.exec(rest);
    if (!m) {
      out.push({ t: rest, s: base });
      break;
    }
    if (m.index > 0) out.push({ t: rest.slice(0, m.index), s: base });
    out.push(m[1] !== undefined ? { t: m[1].replace(/`/g, ""), s: "bold" } : { t: m[2], s: "cyan" });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

const LEAD = /^(\s*)(ok\b|✓|✗|error:|fail\b|warn:?|hold:|note:|direct:|created\b|updated\b|opened\b|added\b|converted\b|routed\b|ticked\b|rebuilt\b)/;
const LEAD_STYLE = /** @type {Record<string, string>} */ ({ ok: "green", "✓": "green", "✗": "red", "error:": "red", fail: "red", "warn:": "yellow", warn: "yellow", "hold:": "yellow", "note:": "yellow", "direct:": "green" });

/** A line a command printed, with the word it leads with in its colour. */
function outputSegs(text) {
  if (/^\s*[─═-]{4,}/.test(text) || /^\s*<!--/.test(text)) return [{ t: text, s: "gray" }];
  if (/^#+\s/.test(text)) return [{ t: text.replace(/^#+\s/, ""), s: "bold" }];
  const m = LEAD.exec(text);
  if (!m) return inline(text, undefined);
  return [{ t: m[1] }, { t: m[2], s: LEAD_STYLE[m[2]] ?? "green" }, ...inline(text.slice(m[0].length), undefined)];
}

/** What the console opens on. */
function banner(width) {
  const lead = { first: [{ t: "    " }], rest: [{ t: "    " }] };
  return [
    [{ t: "  ◆ ", s: "brandBold" }, { t: "Doctrina", s: "bold" }],
    ...wrap([{ t: "specs are the truth · changes go through the gates", s: "gray" }], width, lead),
    [],
    ...wrap([{ t: "Say what you want changed", s: "bold" }, { t: " and the agent opens the change, writes the delta, implements it and closes it. Every step lands in this window." }], width, lead),
    [],
    ...(width >= 62
      ? [
        [{ t: "    /", s: "brandBold" }, { t: "  a command      " }, { t: "/next  /status  /work \"…\"  /close <id>", s: "gray" }],
        [{ t: "    @", s: "brandBold" }, { t: "  an artifact    " }, { t: "@spec:…  @change:…  @skill:…  @adr:…", s: "gray" }],
      ]
      : [
        [{ t: "    /", s: "brandBold" }, { t: "  a command   " }, { t: "/next  /work \"…\"", s: "gray" }],
        [{ t: "    @", s: "brandBold" }, { t: "  an artifact " }, { t: "@spec:…  @change:…", s: "gray" }],
      ]),
    [{ t: "    ?", s: "brandBold" }, { t: "  help" }],
  ];
}

/**
 * The conversation as wrapped lines.
 * @param {Entry[]} transcript
 * @param {number} width
 * @returns {Seg[][]}
 */
function transcriptLines(transcript, width) {
  /** @type {Seg[][]} */
  const out = [];
  let fenced = false;
  for (const e of transcript) {
    switch (e.kind) {
      case "banner":
        out.push(...banner(width));
        break;
      case "blank":
        if (out.length > 0 && out[out.length - 1].length > 0) out.push([]);
        break;
      case "user":
        out.push(...wrap([{ t: e.text, s: "bold" }], width, { first: [{ t: " › ", s: "brandBold" }], rest: [{ t: "   " }] }));
        break;
      case "agent":
        for (const [i, para] of e.text.replace(/\s+$/, "").split("\n").entries()) {
          if (/^\s*```/.test(para)) {
            fenced = !fenced;
            continue;
          }
          const lead = { first: [i === 0 ? { t: " ◆ ", s: "brand" } : { t: "   " }], rest: [{ t: "   " }] };
          if (fenced) out.push(...wrap([{ t: para, s: "cyan" }], width, lead));
          else if (/^#+\s/.test(para)) out.push(...wrap([{ t: para.replace(/^#+\s/, ""), s: "bold" }], width, lead));
          else out.push(...wrap(inline(para, undefined), width, lead));
        }
        fenced = false;
        break;
      case "tool": {
        const [name, ...detail] = e.text.split("  ");
        out.push(...wrap([{ t: name, s: "cyan" }, { t: detail.length ? `  ${detail.join("  ")}` : "", s: "gray" }], width, { first: [{ t: "   └ ", s: "gray" }], rest: [{ t: "     " }] }));
        break;
      }
      case "note":
        out.push(...wrap([{ t: e.text, s: "gray" }], width, { first: [{ t: "   " }], rest: [{ t: "   " }] }));
        break;
      case "peer": {
        // What crossed between consoles: who, then what.
        const [head, ...body] = e.text.split("  ");
        out.push(...wrap([{ t: head, s: "brandBold" }, { t: body.length ? `  ${body.join("  ")}` : "", s: "bold" }], width, { first: [{ t: " ↔ ", s: "brandBold" }], rest: [{ t: "   " }] }));
        break;
      }
      case "quote":
        for (const para of e.text.replace(/\s+$/, "").split("\n")) {
          if (/^\s*```/.test(para)) continue;
          out.push(...wrap(inline(para.replace(/^#+\s/, ""), undefined), width, { first: [{ t: "   │ ", s: "gray" }], rest: [{ t: "   │ ", s: "gray" }] }));
        }
        break;
      case "ok":
        out.push([{ t: "   ✓ ", s: "green" }, { t: e.text, s: "gray" }]);
        break;
      case "fail":
        out.push(...wrap([{ t: e.text, s: "red" }], width, { first: [{ t: "   ✗ ", s: "red" }], rest: [{ t: "     " }] }));
        break;
      default:
        out.push(...wrap(outputSegs(e.text), width, { first: [{ t: "   " }], rest: [{ t: "   " }] }));
    }
  }
  return out;
}

const LIGHT = /** @type {Record<string, [string, string]>} */ ({ ok: ["✓", "green"], warn: ["!", "yellow"], fail: ["✗", "red"], off: ["·", "gray"] });

/**
 * `doctrina next` as it is typed here: `/next`. A command that belongs to
 * another repository is shown as it is run there, with the repository named.
 */
function asTyped(command) {
  const text = command ?? "";
  const elsewhere = /^cd\s+(\S+)\s+&&\s+(.+)$/.exec(text);
  if (elsewhere) return `in ${elsewhere[1].replace(/[\\/]+$/, "").split(/[\\/]/).pop()}: ${elsewhere[2]}`;
  return text.replace(/^doctrina\s+/, "/");
}

const STAGES = ["plan", "build", "close"];

/** The stage track of one open change: ● plan ─ ○ build ─ ○ close. */
function stageTrack(stage) {
  const at = STAGES.indexOf(stage);
  /** @type {Seg[]} */
  const out = [];
  STAGES.forEach((name, i) => {
    if (i > 0) out.push({ t: " ─ ", s: "gray" });
    out.push(i < at ? { t: `✓ ${name}`, s: "green" } : (i === at ? { t: `● ${name}`, s: "brandBold" } : { t: `○ ${name}`, s: "gray" }));
  });
  return out;
}

function taskBar(done, total, cells = 10) {
  const filled = total > 0 ? Math.round((done / total) * cells) : 0;
  return [{ t: "■".repeat(filled), s: "brand" }, { t: "□".repeat(cells - filled), s: "gray" }, { t: `  ${done}/${total}`, s: "gray" }];
}

/** The first `n` lines of a wrapped block; an ellipsis says there was more. */
function cut(lines, n) {
  if (lines.length <= n) return lines;
  const kept = lines.slice(0, n);
  kept[n - 1] = [...kept[n - 1], { t: "…", s: "gray" }];
  return kept;
}

/**
 * The panel: what is open, at which stage, and what comes next.
 * @param {State} s
 * @param {number} width
 * @returns {Seg[][]}
 */
function panelLines(s, width) {
  const p = s.panel;
  /** @type {Seg[][]} */
  const out = [];
  const head = (/** @type {string} */ t) => out.push([{ t: ` ${t}`, s: "gray" }]);
  if (!p) return [[{ t: " reading the project…", s: "gray" }]];
  const inner = width - 2;
  if (p.kind === "none") {
    head("NO PROJECT HERE");
    out.push(...wrap([{ t: "This directory has no .doctrina/ yet." }], inner, { first: [{ t: " " }], rest: [{ t: " " }] }));
  }
  if (p.kind === "workspace") {
    head("PROJECTS");
    for (const pr of p.projects) {
      const [glyph, style] = pr.state === "ready" ? LIGHT.ok : (pr.state === "missing" ? LIGHT.fail : LIGHT.warn);
      out.push([{ t: ` ${glyph} `, s: style }, { t: pr.name, s: "bold" }, { t: `  ${pr.state === "ready" ? pr.reason : pr.state}`, s: "gray" }]);
    }
    out.push([]);
  }
  // The consoles open in other terminals, when there are any.
  if (s.peers.length > 0) {
    head("CONSOLES");
    for (const peer of s.peers.slice(0, 5)) {
      out.push([{ t: " ↔ ", s: "brand" }, { t: peer.name, s: "bold" }, { t: `  ${peer.busy ? "busy" : "idle"}${peer.agent ? ` · ${peer.agent}` : " · no agent"}${peer.listening ? "" : " · deaf"}`, s: "gray" }]);
    }
    if (s.peers.length > 5) out.push([{ t: ` … and ${s.peers.length - 5} more — /peers`, s: "gray" }]);
    out.push([]);
  }
  if (p.kind !== "none") {
    head(p.kind === "workspace" ? "OPEN DELIVERIES" : "OPEN WORK");
    if (p.open.length === 0) out.push([{ t: " nothing open", s: "gray" }]);
    for (const ch of p.open.slice(0, 3)) {
      out.push([{ t: ` ${ch.id}`, s: "bold" }]);
      if (p.kind === "project") {
        out.push([{ t: " " }, ...stageTrack(ch.stage)]);
        out.push([{ t: " " }, ...taskBar(ch.done, ch.total), { t: " tasks", s: "gray" }]);
      } else {
        out.push([{ t: " " }, ...taskBar(ch.done, ch.total), { t: " changes closed", s: "gray" }]);
      }
    }
    if (p.open.length > 3) out.push([{ t: ` … and ${p.open.length - 3} more`, s: "gray" }]);
    out.push([]);
  }
  head("NEXT");
  if (p.next.length === 0) out.push([{ t: " nothing pending", s: "gray" }]);
  p.next.slice(0, 3).forEach((a, i) => {
    out.push(...cut(wrap([{ t: a.text }], inner, { first: [{ t: ` ${i + 1} `, s: "brand" }], rest: [{ t: "   " }] }), 3));
    if (a.command) out.push(...cut(wrap([{ t: asTyped(a.command), s: "cyan" }], inner, { first: [{ t: "   " }], rest: [{ t: "   " }] }), 2));
  });
  if (p.recent.length > 0) {
    out.push([]);
    head("RECENTLY CLOSED");
    for (const r of p.recent.slice(0, 3)) out.push([{ t: " ✓ ", s: "green" }, { t: r.id, s: "gray" }]);
  }
  return out;
}

/** The gates, as lights: index ✓  coverage ✓ 100%  … */
function gateSegs(s, roomy) {
  const p = s.panel;
  /** @type {Seg[]} */
  const out = [{ t: " " }];
  if (!p) return [{ t: " reading the project…", s: "gray" }];
  if (p.kind === "none") return [{ t: " not a Doctrina project — ", s: "gray" }, { t: "/init", s: "cyan" }, { t: " sets it up, ", s: "gray" }, { t: "/onboard", s: "cyan" }, { t: " walks you through", s: "gray" }];
  p.gates.forEach((g, i) => {
    const [glyph, style] = LIGHT[g.state];
    if (i > 0) out.push({ t: "   " });
    out.push({ t: `${g.id} `, s: g.state === "off" ? "gray" : undefined }, { t: glyph, s: style });
    if (roomy && g.id !== "index") out.push({ t: ` ${g.text}`, s: "gray" });
  });
  return out;
}

function countsText(p) {
  if (!p || p.kind !== "project") return "";
  return `${p.counts.specs} spec${p.counts.specs === 1 ? "" : "s"} · ${p.counts.decisions} ADR${p.counts.decisions === 1 ? "" : "s"} · ${p.counts.closed} closed`;
}

/** Two groups on one line: the left one, and the right one flush right. */
function spread(left, right, width, color) {
  const rw = segsWidth(right);
  if (rw === 0 || rw + 2 > width) return fit(left, width, color);
  return fit(left, width - rw, color) + fit(right, rw, color);
}

/**
 * One frame.
 * @param {State} s
 * @param {{ cols: number, rows: number, color?: boolean, now?: number }} size
 * @returns {{ lines: string[], cursor: { row: number, col: number } }}
 */
export function renderFrame(s, { cols, rows, color = true, now = Date.now() }) {
  if (cols < 30 || rows < 10) {
    const lines = Array.from({ length: rows }, (_, i) => (i === 0 ? fit([{ t: "Doctrina — the window is too small" }], cols, color) : " ".repeat(cols)));
    return { lines, cursor: { row: 0, col: 0 } };
  }
  const p = s.panel;
  const agent = s.agents.find((a) => a.id === s.agent) ?? null;
  const panelW = s.showPanel ? (cols >= 104 ? 38 : (cols >= 84 ? 32 : 0)) : 0;

  // Header: the mark, the project, and who answers.
  /** @type {string[]} */
  const top = [];
  const name = p?.project ? [{ t: "  │  ", s: "gray" }, { t: p.project, s: "bold" }, ...(p.kind === "workspace" ? [{ t: "  workspace", s: "gray" }] : [])] : [];
  // The model a person chose, or the one the agent said it is running.
  const model = agent ? (s.models[agent.id] ?? s.reported[agent.id] ?? "") : "";
  // How many other consoles are in the room, when any is.
  const room = s.peers.length > 0 ? [{ t: `↔ ${s.peers.length}   `, s: "brand" }] : [];
  const who = agent
    ? [...room, { t: "● ", s: "green" }, { t: agent.id }, ...(model && cols >= 72 ? [{ t: ` · ${model}`, s: "gray" }] : []), { t: `   v${p?.cli ?? ""} `, s: "gray" }]
    : [...room, { t: "○ no agent", s: "gray" }, { t: `   v${p?.cli ?? ""} `, s: "gray" }];
  top.push(spread([{ t: " ◆ ", s: "brandBold" }, { t: "Doctrina", s: "bold" }, ...name], who, cols, color));
  const counts = countsText(p);
  top.push(spread(gateSegs(s, cols >= 72), cols >= 96 && counts ? [{ t: `${counts} `, s: "gray" }] : [], cols, color));
  // Without room for the panel, its first facts ride one strip.
  if (panelW === 0 && s.showPanel && p && p.kind !== "none") {
    const first = p.open[0];
    const step = p.next[0];
    /** @type {Seg[]} */
    const strip = [{ t: " " }];
    if (first) strip.push({ t: "► ", s: "brand" }, { t: first.id, s: "bold" }, { t: `  ${first.stage} ${first.done}/${first.total}`, s: "gray" });
    else strip.push({ t: "nothing open", s: "gray" });
    if (step) strip.push({ t: "   next ", s: "gray" }, step.command ? { t: asTyped(step.command), s: "cyan" } : { t: step.text });
    top.push(fit(strip, cols, color));
  }
  top.push(fit([{ t: "─".repeat(cols), s: "gray" }], cols, color));

  // The line being typed, wrapped.
  const typed = s.input.join("");
  const boxInner = cols - 4;
  const inputSegs = typed === ""
    ? [{ t: agent ? `Ask ${agent.label} for a change, or type / for commands` : "Type / for commands — no agent is connected", s: "gray" }]
    : [{ t: typed }];
  const allInput = wrapInput(s.input, s.cursor, boxInner - 2);
  // The box grows with the line, but never takes the conversation's last row.
  const inputRows = Math.max(1, Math.min(INPUT_ROWS, rows - top.length - 4));
  const firstShown = Math.max(0, Math.min(allInput.cursorLine - inputRows + 1, allInput.lines.length - inputRows));
  const shown = typed === "" ? [""] : allInput.lines.slice(firstShown, firstShown + inputRows);

  // The box's top edge says what is running.
  const spin = SPINNER[Math.floor(now / 90) % SPINNER.length];
  const label = s.busy
    ? [{ t: ` ${spin} `, s: "brand" }, { t: `${s.busy.label} `, s: "bold" },
      { t: `${Math.max(0, Math.round((now - s.busy.since) / 1000))}s${s.serving ? ` · for ${s.serving.from.name}` : ""} · esc interrupts `, s: "gray" }]
    : (agent
      ? [{ t: ` to ${agent.label}${model ? ` · ${model}` : ""}${s.session ? " · same conversation" : ""} `, s: "gray" }]
      : [{ t: " no agent — /agent chooses one ", s: "gray" }]);
  const edge = (/** @type {string} */ l, /** @type {string} */ r, /** @type {Seg[]} */ mid) => {
    const w = segsWidth(mid);
    const fill = Math.max(0, cols - 4 - w);
    return fit([{ t: `${l}─`, s: "gray" }, ...mid, { t: `${"─".repeat(fill)}─${r}`, s: "gray" }], cols, color);
  };
  /** @type {string[]} */
  const bottom = [edge("╭", "╮", label)];
  shown.forEach((line, i) => {
    const lead = i === 0 && firstShown === 0 ? [{ t: "› ", s: "brandBold" }] : [{ t: "  " }];
    const body = typed === "" ? inputSegs : [{ t: line }];
    bottom.push(fit([{ t: "│ ", s: "gray" }, ...lead, ...body], cols - 2, color) + fit([{ t: " │", s: "gray" }], 2, color));
  });
  bottom.push(edge("╰", "╯", []));
  const palette = paletteOf(s);
  const hints = s.busy ? "esc interrupt · keep typing your next request"
    : (palette ? "↑↓ choose · tab complete · enter run · esc close"
      : (cols >= 80 ? "enter send · / commands · @ mention · ↑↓ history · pgup/pgdn scroll · ? help" : "enter send · / commands · @ mention · ? help"));
  // One column short: a character in the last cell of the last row scrolls some terminals.
  bottom.push(spread([{ t: ` ${hints}`, s: "gray" }], s.notice ? [{ t: `${s.notice} `, s: "yellow" }] : [], cols - 1, color));

  // The body: the conversation, and the panel beside it.
  const bodyH = Math.max(1, rows - top.length - bottom.length);
  const leftW = panelW > 0 ? cols - panelW - 1 : cols;
  const all = transcriptLines(s.transcript, leftW - 1);
  const maxScroll = Math.max(0, all.length - bodyH);
  const scroll = Math.min(s.scroll, maxScroll);
  // The opening screen is read from its first line; a conversation from its last.
  const start = s.said ? Math.max(0, all.length - bodyH - scroll) : 0;
  const visible = all.slice(start, start + bodyH);
  /** @type {Seg[][]} */
  const left = [...visible];
  while (left.length < bodyH) left.push([]);
  if (scroll > 0) left[bodyH - 1] = [{ t: `   ↓ ${scroll} more line${scroll === 1 ? "" : "s"} below — pgdn`, s: "yellow" }];

  // The palette covers the bottom of the conversation.
  if (palette) {
    const n = palette.items.length;
    const at = Math.min(s.paletteAt, n - 1);
    const rowsShown = Math.min(PALETTE_ROWS, n, bodyH - 1);
    const from = Math.max(0, Math.min(at - Math.floor(rowsShown / 2), n - rowsShown));
    // The names share one column, as wide as the longest shown — up to half the line.
    const nameW = Math.min(Math.floor(leftW / 2), Math.max(...palette.items.slice(from, from + rowsShown).map((it) => textWidth(it.value))) + 2);
    const base = bodyH - rowsShown - 1;
    left[base] = [{ t: ` ${palette.kind === "slash" ? "commands" : "artifacts"} `, s: "gray" }, { t: "─".repeat(Math.max(0, leftW - 14)), s: "gray" },
      { t: n > rowsShown ? ` ${at + 1}/${n}` : "", s: "gray" }];
    for (let i = 0; i < rowsShown; i++) {
      const it = palette.items[from + i];
      const sel = from + i === at;
      const value = textWidth(it.value) > nameW - 2 ? `${Array.from(it.value).slice(0, nameW - 3).join("")}…  ` : it.value.padEnd(nameW);
      left[base + 1 + i] = [{ t: sel ? " ► " : "   ", s: "brandBold" }, { t: value, s: sel ? "selected" : "cyan" }, { t: it.label, s: sel ? undefined : "gray" }];
    }
  }

  const right = panelW > 0 ? panelLines(s, panelW) : [];
  const body = left.map((segs, i) => (panelW > 0
    ? fit(segs, leftW, color) + fit([{ t: "│", s: "gray" }], 1, color) + fit(right[i] ?? [], panelW, color)
    : fit(segs, cols, color)));

  const lines = [...top, ...body, ...bottom];
  const cursorRow = top.length + bodyH + 1 + (typed === "" ? 0 : allInput.cursorLine - firstShown);
  const cursorCol = 4 + (typed === "" ? 0 : allInput.cursorCol);
  return { lines: lines.slice(0, rows), cursor: { row: Math.min(cursorRow, rows - 1), col: Math.min(cursorCol, cols - 1) } };
}

/**
 * The typed line cut into rows of `width` columns, and where the cursor falls.
 * @param {string[]} chars
 * @param {number} cursor
 * @param {number} width
 */
function wrapInput(chars, cursor, width) {
  const w = Math.max(4, width);
  /** @type {string[]} */
  const lines = [""];
  let used = 0;
  let cursorLine = 0;
  let cursorCol = 0;
  chars.forEach((ch, i) => {
    const cw = charWidth(ch);
    if (used + cw > w) {
      lines.push("");
      used = 0;
    }
    if (i === cursor) {
      cursorLine = lines.length - 1;
      cursorCol = used;
    }
    lines[lines.length - 1] += ch;
    used += cw;
  });
  if (cursor >= chars.length) {
    // The cursor sits after the last character, on a new row when that one is full.
    if (used >= w) {
      lines.push("");
      used = 0;
    }
    cursorLine = lines.length - 1;
    cursorCol = used;
  }
  return { lines, cursorLine, cursorCol };
}

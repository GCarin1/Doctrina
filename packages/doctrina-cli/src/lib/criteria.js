// @ts-check
// Shared parser for the "## Acceptance criteria" section of a spec.
//
// A criterion is a numbered item that MAY span several lines (continuation
// prose), and its evidence is cited as a backtick path span on ANY of those
// lines. A single-line parser silently misses proof sitting on a continuation
// line — the bug that made `doctrina why` print "no evidence cited" for a
// criterion `doctrina coverage` counted as covered. Both commands (and the
// validate honest-gate) read criteria through this one parser so they can
// never disagree about what a criterion cites.
//
// Returns one row per criterion: { n, marker, body, proofPaths } where marker
// is the lowercased `[tag]` (e.g. "verified", "unverified") or null, and
// proofPaths is the de-duplicated list of file-path-looking backtick tokens.

export function parseAcceptanceCriteria(text) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  const rows = [];
  let cur = null;
  // The opening marker while inside a fenced block, else null. A spec that
  // documents the criterion format writes an EXAMPLE criterion inside a
  // fence, and without this the example counted: a `[verified]` sample
  // citing `pkg/x.js` inflated coverage and `show <cap>-C2` answered with
  // the example instead of the criterion (third audit, finding 4). Content
  // inside a fence is a picture of a criterion, never one.
  let fence = null;
  const flush = () => {
    if (cur) {
      cur.proofPaths = backtickPaths(cur.body);
      rows.push(cur);
    }
    cur = null;
  };
  for (const line of lines) {
    // Fence state is tracked over the WHOLE file, not just the section: an
    // earlier fence containing a `## Acceptance criteria` line must not be
    // mistaken for the section starting.
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      // Closed by the same character, at least as long, alone on the line.
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length
        && line.trim() === marker[1]) {
        fence = null;
      }
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    if (/^##\s+/.test(line)) {
      if (inSection) {
        flush();
        inSection = false;
      }
      if (/^##\s+Acceptance criteria\b/i.test(line)) inSection = true;
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (m) {
      flush();
      const body = m[2];
      const markMatch = body.match(/^\[([^\]]+)\]/);
      cur = { n: Number(m[1]), marker: markMatch ? markMatch[1].toLowerCase() : null, body };
    } else if (cur) {
      cur.body += (line.trim() === "" ? " " : " " + line.trim());
    }
  }
  flush();
  return rows.filter((r) => r.body.trim().length > 0);
}

// True when a criterion asserts it has been verified (the `[verified...]` tag).
export function isVerified(row) {
  return row.marker !== null && /^verified/.test(row.marker);
}

function backtickPaths(text) {
  const out = new Set();
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const token = m[1].trim();
    if (looksLikePath(token)) out.add(token);
  }
  return [...out];
}

// Mirrors the coverage heuristic so the two commands agree: a token is a path
// if it has a slash or a file extension and is not a URL/placeholder.
function looksLikePath(s) {
  if (!s) return false;
  if (/^(https?:|mailto:|ftp:|#|@)/i.test(s)) return false;
  if (/[\s<>*?{}]/.test(s)) return false;
  const hasSlash = s.includes("/");
  const hasExt = /\.[a-z0-9]{1,8}$/i.test(s);
  if (!hasSlash && !hasExt) return false;
  if (s.startsWith("-")) return false;
  return true;
}

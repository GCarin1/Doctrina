// Tiny Levenshtein distance + "did you mean" suggester. Zero deps.

export function distance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Return the closest match from `candidates` to `input`, or null
// when no candidate is close enough.
export function suggest(input, candidates) {
  if (!input || !candidates || candidates.length === 0) return null;
  const inputLower = String(input).toLowerCase();
  let best = null;
  let bestD = Infinity;
  for (const cand of candidates) {
    const d = distance(inputLower, String(cand).toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  }
  // Threshold: at most ceil(len/3), and never more than 3 absolute.
  const threshold = Math.min(3, Math.ceil(inputLower.length / 3));
  return bestD <= threshold ? best : null;
}

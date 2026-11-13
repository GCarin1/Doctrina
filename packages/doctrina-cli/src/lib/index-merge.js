// @ts-check
import { ARTIFACT_CATEGORIES } from "./index-json.js";
import { newestVersion } from "./version.js";

// THE INDEX MERGES AS WHAT IT IS: A LIST OF ARTIFACTS (change 0242).
//
// `index.json` is one file every change rewrites — a version here, a closed
// change appended there, the date on top. Two branches that each close a
// change therefore meet on the same lines, and git, which merges text, stops
// with conflict markers in a file nobody wrote by hand.
//
// Merged as data there is nothing to resolve: an entry one branch added is
// added, an entry one branch removed is removed, and where both changed the
// same field the newer value wins — a version only grows, a date only moves
// forward. What this cannot know (a header edited on both sides) the tree
// still decides: `doctrina index rebuild` derives the index from the files,
// and the commit hook runs it.

const key = (/** @type {any} */ entry) => String(entry?.path ?? entry?.id ?? "");
const same = (/** @type {any} */ a, /** @type {any} */ b) => JSON.stringify(a) === JSON.stringify(b);

/** `1.10.0` over `1.9.0`; anything that is not three numbers compares as text. */
function laterVersion(a, b) {
  const parts = (/** @type {string} */ v) => String(v).split(".").map((n) => Number(n));
  const [x, y] = [parts(a), parts(b)];
  if (x.some(Number.isNaN) || y.some(Number.isNaN)) return String(a) >= String(b) ? a : b;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0) ? a : b;
  }
  return a;
}

/** Both sides changed `field` to different values: the one that moved furthest. */
function settle(field, ours, theirs) {
  if (field === "framework_version") return newestVersion(ours, theirs);
  if (field === "version") return laterVersion(ours, theirs);
  if (/(^|_)(updated|date)$/.test(field)) return String(ours) >= String(theirs) ? ours : theirs;
  return ours;
}

/** Three-way merge of one object's fields. */
function mergeFields(base, ours, theirs) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const field of new Set([...Object.keys(ours ?? {}), ...Object.keys(theirs ?? {})])) {
    const [b, o, t] = [base?.[field], ours?.[field], theirs?.[field]];
    let value;
    if (same(o, t) || same(t, b)) value = o;
    else if (same(o, b)) value = t;
    else if (o === undefined || t === undefined) value = o ?? t;
    else value = settle(field, o, t);
    if (value !== undefined) out[field] = value;
  }
  return out;
}

/** Three-way merge of one artifact category, in the order a rebuild writes. */
function mergeList(base, ours, theirs) {
  const by = (/** @type {any[]} */ list) => new Map((list ?? []).map((e) => [key(e), e]));
  const [b, o, t] = [by(base), by(ours), by(theirs)];
  const out = [];
  for (const k of new Set([...o.keys(), ...t.keys()])) {
    const [eb, eo, et] = [b.get(k), o.get(k), t.get(k)];
    if (eo && et) out.push(mergeFields(eb, eo, et));
    // Present on one side only: added there, or removed on the other. An
    // entry the base never had was added; one it had was removed — unless
    // the side that kept it also changed it, which a removal must not erase.
    else if (!eb) out.push(eo ?? et);
    else if (!same(eo ?? et, eb)) out.push(eo ?? et);
  }
  return out.sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0));
}

/**
 * Merge two indexes that descend from `base`. Pure: returns the merged index.
 * @param {any} base  the common ancestor (`{}` when there is none)
 * @param {any} ours
 * @param {any} theirs
 */
export function mergeIndex(base, ours, theirs) {
  const out = mergeFields({ ...base, artifacts: undefined }, { ...ours, artifacts: undefined }, { ...theirs, artifacts: undefined });
  const [ab, ao, at] = [base?.artifacts ?? {}, ours?.artifacts ?? {}, theirs?.artifacts ?? {}];
  /** @type {Record<string, any>} */
  const artifacts = {};
  for (const cat of new Set([...Object.keys(ao), ...Object.keys(at)])) {
    const list = ARTIFACT_CATEGORIES.includes(cat) || Array.isArray(ao[cat] ?? at[cat]);
    artifacts[cat] = list ? mergeList(ab[cat], ao[cat], at[cat]) : mergeFields(ab[cat], ao[cat] ?? {}, at[cat] ?? {});
  }
  return { ...out, artifacts };
}

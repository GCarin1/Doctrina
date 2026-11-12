// @ts-check
import path from "node:path";
import { readdirSync } from "node:fs";
import { isDir, isFile, read } from "./fs-ops.js";
import { parseAcceptanceCriteria } from "./criteria.js";

// A REQUIREMENT THAT IS AN INVARIANT ASKS FOR A PROPERTY (change 0254).
//
// "The system shall never return a code already in use" is a claim about
// EVERY input, and the evidence a criterion cited for it was an example
// test: three inputs somebody thought of. Coverage called that proven. A
// property-based test generates the inputs — hundreds of them, the ones
// nobody thought of — which is the kind of proof a universal claim wants.
//
// Kiro derives such tests from EARS requirements with a model. The CLI has
// none and does not pretend to: it does the two deterministic halves. It
// says WHICH requirements read as invariants (`coverage --properties`), and
// it refuses to count a criterion marked `[property]` as proven unless the
// test it cites really is a property-based one. Writing the property is the
// agent's work, as writing the test always was.

/** Marks a criterion whose proof must generate its inputs. */
export const PROPERTY_MARKER = /^property\b/;

/** What a property-based test looks like, per library. */
const LIBRARIES = [
  { name: "Hypothesis", re: /@given\s*\(|\bfrom\s+hypothesis\b|\bimport\s+hypothesis\b/ },
  { name: "fast-check", re: /\bfc\.(assert|property|asyncProperty)\s*\(|["']fast-check["']/ },
  { name: "jqwik", re: /@Property\b|\bnet\.jqwik\b/ },
  { name: "proptest", re: /\bproptest!\s*\{/ },
  { name: "quickcheck", re: /\bquickcheck!\s*\{|#\[quickcheck\]|\bquickCheck\b/ },
  { name: "rapid", re: /\brapid\.Check\s*\(|\bquick\.Check\s*\(/ },
  { name: "FsCheck", re: /\bProp\.ForAll\b|\[Property\b/ },
  { name: "ScalaCheck", re: /\bforAll\s*[({]/ },
];

/** The property library a test file uses, or null when it generates nothing. */
export function propertyLibraryIn(text) {
  return LIBRARIES.find((lib) => lib.re.test(String(text)))?.name ?? null;
}

// The shapes a universal claim takes in a requirement, with the property
// each one suggests. English and Portuguese, as the specs are.
const SHAPES = [
  { id: "round-trip",
    re: /\b(round[- ]trip|and back\b|restor\w+ (?:the |its )?(?:original|same|previous)|revers(?:ible|ibly|es)\b|decod\w+|deserializ\w+|ida e volta|restaura\w* (?:o |a )?(?:original|mesm[oa]|anterior))/i,
    property: "for any input x, undoing what was done to x gives x back" },
  { id: "idempotence",
    re: /\b(idempoten\w+|twice|a second time|more than once|applied again|run again|duas vezes|de novo|mais de uma vez|outra vez)\b/i,
    property: "for any input x, doing it twice leaves what doing it once left" },
  { id: "bound",
    re: /\b(at most|at least (?!one\b)|no more than|no fewer than|not exceed|never exceed|within (?:\d|(?:\S+ ){0,3}(?:budget|limit|threshold|ratio|bound|quota|window|deadline)\b)|between \d|no máximo|pelo menos (?!um\b|uma\b)|no mínimo|não excede|entre \d)/i,
    property: "for any input, the result stays inside the stated bound" },
  { id: "uniqueness",
    re: /(?<![\w-])(unique|distinct(?!ive| from)|no two|never the same|(?:not|never) .{0,40}already (?:in use|used|taken|issued|exist\w*|registered)|único|única|distint\w+|nunca .{0,20}repet\w+|já (?:em uso|usad\w+|exist\w+))/i,
    property: "for any sequence of inputs, no two results collide" },
  { id: "order",
    re: /\b(sorted|ordered|in order(?! to\b)|ascending|descending|monoton\w+|ordenad\w+|em ordem|crescente|decrescente)\b/i,
    property: "for any input, the output is in the stated order" },
  { id: "invariant",
    re: /\b(always|never|for every|for any|for all|whatever|sempre|nunca|para todo|para toda|para qualquer|qualquer que seja)\b/i,
    property: "for any input, the stated condition holds" },
];

/** Every requirement bullet under `## Requirements`, with its section and ordinal. */
export function requirementsOf(specText) {
  const out = [];
  let inside = false;
  let section = null;
  let n = 0;
  let cur = null;
  for (const line of String(specText).split(/\r?\n/)) {
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      inside = /^##\s+Requirements\b/i.test(line);
      section = null;
      cur = null;
      continue;
    }
    if (!inside) continue;
    const h = line.match(/^###\s+(\S+)/);
    if (h) {
      section = h[1].toLowerCase().replace(/[^a-z-]/g, "").split("-")[0];
      n = 0;
      cur = null;
      continue;
    }
    if (section && /^-\s+\S/.test(line)) {
      n += 1;
      cur = { section, n, text: line.replace(/^-\s+/, "").trim() };
      out.push(cur);
    } else if (cur && /^\s+\S/.test(line)) {
      cur.text += " " + line.trim();
    } else if (line.trim() === "") {
      cur = null;
    }
  }
  return out;
}

/** The first shape a requirement's text takes, or null when it states no universal claim. */
export function propertyShape(text) {
  const prose = String(text).replace(/`[^`]*`/g, "");
  return SHAPES.find((s) => s.re.test(prose)) ?? null;
}

/** The property library this project's manifests point at, with how sure that is. */
export function projectPropertyLibrary(projectRoot) {
  const text = (/** @type {string} */ rel) => (isFile(path.join(projectRoot, rel)) ? read(path.join(projectRoot, rel)) : "");
  const py = text("pyproject.toml") + text("requirements.txt") + text("requirements-dev.txt") + text("setup.cfg") + text("Pipfile");
  const js = text("package.json");
  if (/\bhypothesis\b/i.test(py)) return { name: "Hypothesis", declared: true };
  if (/"fast-check"/.test(js)) return { name: "fast-check", declared: true };
  if (py.trim() !== "") return { name: "Hypothesis", declared: false };
  if (js.trim() !== "") return { name: "fast-check", declared: false };
  if (isFile(path.join(projectRoot, "pom.xml")) || isFile(path.join(projectRoot, "build.gradle")) || isFile(path.join(projectRoot, "build.gradle.kts"))) return { name: "jqwik", declared: false };
  if (isFile(path.join(projectRoot, "Cargo.toml"))) return { name: "proptest", declared: false };
  if (isFile(path.join(projectRoot, "go.mod"))) return { name: "rapid", declared: false };
  return null;
}

/**
 * Per capability: the requirements that read as invariants, and how many of
 * its criteria are already properties.
 * @param {string} projectRoot
 * @param {{ only?: Set<string> | null }} [opts]
 */
export function propertyCandidates(projectRoot, { only = /** @type {Set<string> | null} */ (null) } = {}) {
  const specsDir = path.join(projectRoot, ".doctrina", "specs");
  const out = [];
  if (!isDir(specsDir)) return out;
  for (const cap of readdirSync(specsDir).sort()) {
    if (only && !only.has(cap)) continue;
    const file = path.join(specsDir, cap, "spec.md");
    if (!isFile(file)) continue;
    const text = read(file);
    const candidates = [];
    for (const req of requirementsOf(text)) {
      const shape = propertyShape(req.text);
      if (shape) candidates.push({ ref: `${req.section} ${req.n}`, text: req.text, shape: shape.id, property: shape.property });
    }
    // The specific shapes first: "at most", "twice", "and back" name the
    // property to write; a bare "always" only says that there is one.
    const rank = (/** @type {string} */ id) => SHAPES.findIndex((s) => s.id === id);
    candidates.sort((a, b) => rank(a.shape) - rank(b.shape));
    const properties = parseAcceptanceCriteria(text).filter((row) => row.marker !== null && PROPERTY_MARKER.test(row.marker)).length;
    out.push({ cap, candidates, properties });
  }
  return out;
}

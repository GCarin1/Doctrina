// @ts-check
// Structural EARS checks for capability specs. The clarify command catches
// word-level smells; this catches grammar-shape problems per EARS section.
// All findings are warnings: specs evolve, validation should not block.

// A prohibition negates its own modal. Either the modal directly
// ("shall not", "shall never") or the object the verb takes, immediately
// ("shall do no work", "shall carry neither X nor Y").
//
// The gap is ONE word wide on purpose. Allowing two lets "shall report when
// no contracts are declared" back in — a report, not a prohibition, and the
// exact shape this check exists to keep out of the must-not section.
const UNWANTED_NEGATION =
  /\bshall\s+(?:not|never)\b|\bshall\s+\w+\s+(?:no|neither|nothing)\b/i;

const SECTION_RULES = [
  {
    match: /^###\s+Ubiquitous/i,
    name: "Ubiquitous",
    check(req) {
      if (/^when\b/i.test(req)) return "event-shaped requirement (starts with \"When\") — move to ### Event-driven";
      if (/^while\b/i.test(req)) return "state-shaped requirement (starts with \"While\") — move to ### State-driven";
      if (/^where\b/i.test(req)) return "optional-shaped requirement (starts with \"Where\") — move to ### Optional";
      if (!/\bshall\b/i.test(req)) return "missing \"shall\" — ubiquitous form is \"The system shall ...\"";
      return null;
    },
  },
  {
    match: /^###\s+Event-driven/i,
    name: "Event-driven",
    check(req) {
      if (!/^when\b/i.test(req)) return "expected \"When <trigger>, the system shall ...\"";
      if (!/\bshall\b/i.test(req)) return "missing \"shall\" after the When-trigger";
      return null;
    },
  },
  {
    match: /^###\s+State-driven/i,
    name: "State-driven",
    check(req) {
      if (!/^while\b/i.test(req)) return "expected \"While <state>, the system shall ...\"";
      if (!/\bshall\b/i.test(req)) return "missing \"shall\" after the While-state";
      return null;
    },
  },
  {
    match: /^###\s+Unwanted/i,
    name: "Unwanted-behavior",
    check(req) {
      if (!/\bshall\b/i.test(req)) return "missing \"shall\" — unwanted-behavior form is \"The system shall not ...\"";
      // The negation has to hang off the MODAL, not merely appear somewhere in
      // the sentence. Searching the whole line let "no" the determiner stand
      // in for a prohibition: "the system shall report it as a finding, because
      // a claim over code that is not there..." forbids nothing and passed.
      // Two requirements of this repository's own specs were positive
      // obligations filed under must-not for exactly that reason.
      //
      // Both attachments count: "shall not/never <verb>", and the form that
      // negates the object instead — "shall do no work", "shall carry neither".
      if (!UNWANTED_NEGATION.test(req)) {
        return "missing a negation on \"shall\" — unwanted-behavior forbids something "
          + "(\"shall not ...\", \"shall never ...\", \"shall <verb> no ...\"); a "
          + "requirement that only reports or accepts belongs in another section";
      }
      return null;
    },
  },
  {
    match: /^###\s+Optional/i,
    name: "Optional",
    check(req) {
      if (!/^where\b/i.test(req)) return "expected \"Where <feature is present>, the system may ...\"";
      if (!/\bmay\b/i.test(req)) return "missing \"may\" — optional requirements use may, not shall";
      return null;
    },
  },
];

// Check one spec text. Returns [{ line, message }]. Only applies to specs
// that declare a "## Requirements (EARS)" section; bug-shape specs and
// free-form specs are skipped entirely.
export function checkEars(text) {
  const lines = text.split("\n");
  const findings = [];

  let inRequirements = false;
  let rule = null;
  let req = null; // { line, text }

  const flush = () => {
    if (req && rule) {
      const message = rule.check(req.text.trim());
      if (message) findings.push({ line: req.line, message: `${rule.name}: ${message}` });
    }
    req = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^##\s+Requirements \(EARS\)/i.test(line)) {
      inRequirements = true;
      continue;
    }
    if (!inRequirements) continue;
    if (/^##\s+/.test(line)) {
      // Left the Requirements section.
      flush();
      break;
    }
    if (/^###\s+/.test(line)) {
      flush();
      rule = SECTION_RULES.find((r) => r.match.test(line)) ?? null;
      continue;
    }
    if (/^-\s+/.test(line)) {
      flush();
      req = { line: i + 1, text: line.replace(/^-\s+/, "") };
      continue;
    }
    // Continuation of the current bullet (indented text or nested bullet).
    if (req && /^\s+\S/.test(line)) {
      req.text += " " + line.trim();
    }
  }
  flush();
  return findings;
}

export function isEarsSpec(text) {
  return /^##\s+Requirements \(EARS\)/im.test(text);
}

// @ts-check
import { fold } from "./lexicon.js";
// The lane CLASSIFIER (ADR 0024).
//
// `work` asks the same question `triage` answers — is this request PRODUCT,
// RUNTIME or CHORE — and imported the answer out of the command module
// (audit finding F7). One classifier, read by both.

// The prompt is FOLDED before matching (change 0107): accents stripped,
// lower-cased — the same `fold` `work` and `context --for` retrieve with
// (ADR 0040). Every pattern below is written in folded (ASCII) form, and
// the Portuguese half of each list sits next to the English half: the
// lexicon was English-only, so "the build is broken in CI, DATABASE_URL
// never reaches the process" was held as RUNTIME with exit 3 while the
// same sentence in Portuguese opened a change. A project whose prompts
// arrive in Portuguese (this one) had no guard at all.
export const CHORE_SIGNALS = [
  [3, /\b(bump|upgrade|pin|lockfile|dependency|dependencies|devdependenc)\b/i],
  [2, /\b(rename|move|reorganis|reorganiz|refactor|tidy|cleanup|clean up|format(ting)?|lint)\b/i],
  [2, /\b(typo|comment|readme|changelog|docs? only)\b/i],
  [2, /\b(already (specified|in the spec)|wiring only|no behaviour change|no behavior change)\b/i],
  // pt
  [3, /\b(atualizar (a |as )?dependencia|dependencias|fixar (a )?versao)\b/i],
  [2, /\b(renomear|mover|reorganizar|refatorar|arrumar|limpeza|limpar|formatar|formatacao)\b/i],
  [2, /\b(erro de digitacao|comentario|so (a )?doc(umentacao)?)\b/i],
  [2, /\b(ja (esta )?(especificad[oa]|na spec)|so (a )?fiacao|sem mudanca de comportamento)\b/i],
];
export const PRODUCT_SIGNALS = [
  [3, /\b(add|introduce|support|allow|enable|implement|build)\b/i],
  [3, /\b(should|shall|must|requirement|acceptance|criteri)\b/i],
  // AUTHORING VERBS. Both lanes above match domain NOUNS, which turned out
  // to misread work ON the machinery as an incident IN it: "declare the
  // release workflow wiring in a contract" scored RUNTIME on "workflow" and
  // "wiring", and "so an intentional rename stops warning" scored CHORE on
  // "rename" — a noun, not the act. Neither prompt was a diagnosis; both
  // were someone sitting down to write an artifact.
  //
  // These are the verbs of authoring. A prompt whose verb is "declare" or
  // "document" is describing work on the tree, whatever nouns surround it.
  [3, /\b(declare|declaring|document|documenting|record|recording|specify|specifying|define|defining)\b/i],
  [2, /\b(new (feature|capability|command|endpoint|screen|flow))\b/i],
  [2, /\b(users? (can|should|want)|so that|in order to)\b/i],
  [1, /\b(change|behaviour|behavior|spec)\b/i],
  // pt
  [3, /\b(adicionar|introduzir|suportar|permitir|habilitar|implementar|construir|criar)\b/i],
  [3, /\b(deve|devera|requisito|aceite|aceitacao|criterio)\b/i],
  [3, /\b(declarar|declarando|documentar|documentando|registrar|registrando|especificar|especificando|definir|definindo)\b/i],
  [2, /\b(nov[oa] (feature|funcionalidade|capability|capacidade|comando|endpoint|tela|fluxo))\b/i],
  [2, /\b(usuari[oa]s? (pode|podem|deve|devem|quer|querem)|para que|de modo que|a fim de)\b/i],
  [1, /\b(mudanca|comportamento)\b/i],
];
// Signals that a request is about the running system rather than about what
// the system should do. Weighted: a phrase that can only mean runtime counts
// for more than a word that merely leans that way.
export const RUNTIME_SIGNALS = [
  [3, /\b(workflow|pipeline|ci|github actions|actions run|job|runner)\b/i],
  [3, /\b(env var|environment variable|dotenv|\.env|secret|secrets|vars)\b/i],
  [3, /\b(0 (tests?|scenarios?|cases?)|no (tests?|scenarios?) ran|ran nothing|empty (run|suite|summary))\b/i],
  [2, /\b(exit code|stack ?trace|traceback|logs?|step summary|artifact missing)\b/i],
  [2, /\b(green but|passes but|silently|never (fires|applies|reaches|ran))\b/i],
  [2, /\b(flaky|timeout|timed out|hangs?|crash(es|ed)?|broken build|failing build)\b/i],
  [2, /\b(tag|selector|filter|dispatch)\b/i],
  [1, /\b(config|configuration|wiring|wired|deploy(ment)?|docker|compose)\b/i],
  [1, /\b(debug|diagnos(e|is)|investigate|why (is|does|did)|not working|doesn't work)\b/i],
  // pt
  [3, /\b(execucao d[oa]s? actions|esteira)\b/i],
  [3, /\b(variavel de ambiente|variaveis de ambiente|segredo|segredos)\b/i],
  [3, /\b(0 (testes?|cenarios?|casos?)|nenhum (teste|cenario|caso) (rodou|correu|executou)|(rodou|correu|executou) nada|(execucao|suite|resumo) vazi[oa])\b/i],
  [2, /\b(codigo de saida|resumo d[oa] (step|etapa)|artefato (ausente|faltando|sumiu))\b/i],
  [2, /\b(verde mas|passa mas|silenciosamente|em silencio|nunca (dispara|aplica|chega|rodou|correu|executou))\b/i],
  [2, /\b(intermitente|estourou o tempo|trava|travou|crashou|build (quebrad[oa]|falhando|falhou))\b/i],
  [2, /\b(seletor|filtro|despacho)\b/i],
  [1, /\b(configuracao|fiacao|implantacao)\b/i],
  [1, /\b(depurar|diagnostic(o|ar)|investigar|por que (esta|e|nao)|nao funciona|nao esta funcionando)\b/i],
];

export function classify(prompt) {
  const text = fold(prompt);
  const score = (signals) => {
    let total = 0;
    const hits = [];
    for (const [weight, re] of signals) {
      const m = text.match(re);
      if (m) {
        total += weight;
        hits.push(m[0].toLowerCase());
      }
    }
    return { total, hits };
  };

  const lanes = {
    runtime: score(RUNTIME_SIGNALS),
    chore: score(CHORE_SIGNALS),
    product: score(PRODUCT_SIGNALS),
  };

  // Product is the default: when nothing distinguishes the request, the
  // ceremony that writes a spec delta is the safe one to fall into. Runtime
  // must BEAT product to win, so an ordinary feature request mentioning a
  // "job" does not get diverted into a diagnosis.
  let lane = "product";
  let best = lanes.product.total;
  for (const name of ["runtime", "chore"]) {
    if (lanes[name].total > best) {
      lane = name;
      best = lanes[name].total;
    }
  }
  if (best === 0) lane = "product";

  // Confidence is the MARGIN over the runner-up, not the winner's own score:
  // a prompt that scores 5 for runtime and 4 for product is a coin toss the
  // agent should see as one, and a clear product request must be able to read
  // as confident too (comparing a lane against itself never could).
  const runnerUp = Object.entries(lanes)
    .filter(([name]) => name !== lane)
    .reduce((max, [, v]) => Math.max(max, v.total), 0);

  return { lane, scores: lanes, confident: best > 0 && best - runnerUp >= 2 };
}

// THE TRACKS, BY WHAT THE REQUEST CHANGES (change 0255).
//
// The three lanes above say what KIND of request it is. They never said how
// much ceremony it earns, and the default answer was all of it: "fix the
// typo in the README" opened a proposal, three tasks and a thirteen-step
// close. `metrics` already printed "a one-line fix may rightly need none"
// under its adherence rate — the rule existed, in a footnote.
//
// The measure is not the size of the diff. It is whether a sentence in a
// spec becomes false, or one is missing: a one-line change of a timeout the
// spec states is a change, and a two-hundred-line reformat is not.
export const TRACKS = [
  { id: "direct",
    changes: "nothing a spec says — a typo, a comment, formatting, a fix that makes the code do what the spec already says",
    path: "edit · doctrina verify · commit" },
  { id: "chore",
    changes: "the build, the tooling or the docs, worth a record — no spec changes",
    path: 'doctrina work --chore "<request>"' },
  { id: "change",
    changes: "behaviour — a sentence in a spec becomes false, or one is missing",
    path: 'doctrina work "<request>"' },
];

// What the words alone can settle. Each phrase names an edit that cannot
// change behaviour; a bare "comment" or "formatting" is also the name of a
// feature ("comment moderation", "date formatting"), so those need the word
// that says which one is meant. A fix that restores what the spec already
// says is direct too, and no word list can know it: that one is the
// agent's call, by the rule the standing instructions state.
export const DIRECT_SIGNALS = [
  /\b(typos?|misspell\w*|spelling|grammar|whitespace|indentation|trailing (spaces?|whitespace|commas?|newlines?))\b/,
  /\b(formatting only|reformat\w*|fix(ing)? (the )?formatting|code formatting)\b/,
  /\b((code|stale|outdated|old|wrong|misleading) comments?|comments? only|dead code|unused (imports?|variables?))\b/,
  // pt
  /\b(erros? de digitacao|ortografia|gramatica|espacos? em branco|indentacao)\b/,
  /\b(so (a )?formatacao|reformatar|corrigir (a )?formatacao|formatacao do codigo)\b/,
  /\b(comentarios? (de codigo|antig\w+|obsolet\w+|desatualizad\w+|errad\w+)|so (o |os )?comentarios?|codigo morto|imports? nao usad\w+|variave(l|is) nao usad\w+)\b/,
];

/**
 * The signals that make a prompt a direct edit, or none. A prompt that also
 * carries a product or a runtime signal is not direct: "add" or "should"
 * says behaviour is in play, and the ceremony is the safe side to err on.
 * @param {string} prompt
 * @param {ReturnType<typeof classify>} [verdict]
 * @returns {string[]}
 */
export function directSignals(prompt, verdict = classify(prompt)) {
  if (verdict.scores.product.total > 0 || verdict.scores.runtime.total > 0) return [];
  const text = fold(prompt);
  const hits = [];
  for (const re of DIRECT_SIGNALS) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

/** The track a prompt reads as: direct, chore, change — or diagnosis, for a runtime problem. */
export function trackOf(prompt, verdict = classify(prompt)) {
  if (directSignals(prompt, verdict).length > 0) return "direct";
  if (verdict.lane === "runtime") return "diagnosis";
  return verdict.lane === "chore" ? "chore" : "change";
}

/** The three tracks as plain lines, for the commands that print them. */
export function trackLines() {
  const out = [];
  for (const t of TRACKS) {
    out.push(`  ${t.id.padEnd(7)} ${t.changes}`);
    out.push(`          ${t.path}`);
  }
  return out;
}

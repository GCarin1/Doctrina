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

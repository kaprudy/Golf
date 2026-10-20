// AI-functies via de Claude API. De API-sleutel staat alleen lokaal op je telefoon
// (localStorage) en gaat rechtstreeks naar api.anthropic.com.
// Gebundelde @anthropic-ai/sdk 0.135.0 (zie js/vendor), zodat er geen CDN nodig is.
import Anthropic from './vendor/anthropic-sdk.js';

const MODEL = 'claude-opus-5-5';

function client(apiKey) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

async function askJson(apiKey, { system, prompt, schema, effort, maxTokens }) {
  const response = await client(apiKey).beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort, format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') throw new Error('De AI weigerde dit verzoek.');
  if (response.stop_reason === 'max_tokens') throw new Error('Het AI-antwoord was te lang en is afgebroken.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

export function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'Ongeldige API-sleutel. Controleer hem bij Instellingen.';
  if (err instanceof Anthropic.RateLimitError) return 'Even te veel verzoeken. Probeer het zo opnieuw.';
  if (err instanceof Anthropic.APIConnectionError) return 'Geen verbinding met de AI (geen internet?).';
  if (err instanceof Anthropic.APIError) return `AI-fout (${err.status ?? '?'}): ${err.message}`;
  return err?.message ?? String(err);
}

const PARSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hole', 'scores'],
  properties: {
    hole: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'Holenummer als het genoemd wordt, anders null' },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'strokes'],
        properties: {
          name: { type: 'string' },
          strokes: { type: 'integer' },
        },
      },
    },
  },
};

// Vangnet voor zinnen die de lokale herkenning niet snapt.
export async function aiParseEntry(apiKey, text, { players, currentHole, pars }) {
  return askJson(apiKey, {
    system: 'Je zet ingesproken golfscores (Nederlands, via spraakherkenning, kan fouten bevatten) om naar gestructureerde data. Gebruik exact de bekende spelersnamen als een naam erop lijkt. Golftermen reken je om met de par van de hole (birdie = par-1, bogey = par+1, dubbel bogey = par+2, enz.). Verzin geen scores die niet genoemd worden.',
    prompt: `Bekende spelers: ${players.join(', ') || '(nog geen)'}\nHuidige hole (als er geen hole genoemd wordt): ${currentHole}\nPar per hole: ${pars.map((p, i) => `hole ${i + 1}: ${p}`).join(', ')}\n\nTekst: "${text}"`,
    schema: PARSE_SCHEMA,
    effort: 'low',
    maxTokens: 2000,
  });
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['samenvatting', 'spelers', 'controle'],
  properties: {
    samenvatting: { type: 'string', description: 'Korte samenvatting van de ronde (2-4 zinnen)' },
    spelers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['naam', 'analyse', 'tip'],
        properties: {
          naam: { type: 'string' },
          analyse: { type: 'string', description: 'Sterke en zwakke punten, met concrete holes' },
          tip: { type: 'string', description: 'Eén concrete tip voor de volgende ronde' },
        },
      },
    },
    controle: {
      type: 'array',
      description: 'Verschillen tussen de ingesproken teksten en de scorekaart, of verdachte scores. Leeg als alles klopt.',
      items: { type: 'string' },
    },
  },
};

// Eindanalyse: de berekende handicapgegevens + alle ingesproken teksten gaan naar Claude.
export async function aiAnalyseRound(apiKey, { course, results, transcripts }) {
  const data = {
    baan: { naam: course.name, holes: course.holes, par: course.pars, strokeIndex: course.strokeIndexes, courseRating: course.rating, slope: course.slope },
    resultaten: results.map((r) => ({
      naam: r.name,
      slagenPerHole: r.scores,
      bruto: r.gross,
      tegenPar: r.toPar,
      handicapIndexVooraf: r.index,
      courseHandicap: r.courseHandicap,
      stableford: r.stableford,
      aangepasteBrutoScore: r.adjustedGross,
      scoreDifferential: r.differential,
      differential18Holes: r.differential18,
      nieuweHandicapIndex: r.newIndex,
      verdeling: r.tally,
    })),
    ingesprokenTeksten: transcripts,
  };
  return askJson(apiKey, {
    system: 'Je bent een vriendelijke, deskundige golfcoach. Je schrijft in het Nederlands, kort en concreet. De handicapcijfers zijn al correct berekend volgens het World Handicap System; neem ze over en leg ze in gewone taal uit, reken ze niet opnieuw. Vergelijk de ingesproken teksten met de scorekaart en meld afwijkingen.',
    prompt: `Analyseer deze golfronde:\n\n${JSON.stringify(data, null, 2)}`,
    schema: ANALYSIS_SCHEMA,
    effort: 'medium',
    maxTokens: 16000,
  });
}

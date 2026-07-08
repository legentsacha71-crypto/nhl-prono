import { getAbbrevByName, getTeamName } from "./nhlTeams";

type OddsApiOutcome = {
  name: string;
  price: number;
};

type OddsApiMarket = {
  key: string;
  outcomes: OddsApiOutcome[];
};

type OddsApiBookmaker = {
  key: string;
  markets: OddsApiMarket[];
};

type OddsApiEvent = {
  bookmakers: OddsApiBookmaker[];
};

export type StanleyCupOdds = {
  abbrev: string;
  name: string;
  price: number;
};

// Cote moyenne (format décimal) tous bookmakers confondus, pour rester
// indépendant d'un bookmaker en particulier.
export async function getStanleyCupOdds(): Promise<StanleyCupOdds[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    throw new Error("ODDS_API_KEY manquant.");
  }

  // Le marché "vainqueur" (outrights) vit sous une clé de sport dédiée,
  // différente de "icehockey_nhl" qui sert aux cotes de matchs (h2h, etc.).
  // On interroge plusieurs régions (eu + us) pour maximiser les chances
  // qu'un bookmaker couvrant ce marché soit inclus dans la réponse.
  const res = await fetch(
    `https://api.the-odds-api.com/v4/sports/icehockey_nhl_championship_winner/odds?apiKey=${apiKey}&regions=eu,us&markets=outrights`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Erreur The Odds API: ${res.status}${body ? ` — ${body}` : ""}`);
  }

  const events: OddsApiEvent[] = await res.json();

  const pricesByTeam = new Map<string, number[]>();
  const unmatchedNames = new Set<string>();
  let outcomeCount = 0;
  for (const event of events) {
    for (const bookmaker of event.bookmakers) {
      for (const market of bookmaker.markets) {
        if (market.key !== "outrights") continue;
        for (const outcome of market.outcomes) {
          outcomeCount += 1;
          const abbrev = getAbbrevByName(outcome.name);
          if (!abbrev) {
            unmatchedNames.add(outcome.name);
            continue;
          }
          const prices = pricesByTeam.get(abbrev) ?? [];
          prices.push(outcome.price);
          pricesByTeam.set(abbrev, prices);
        }
      }
    }
  }

  const result: StanleyCupOdds[] = [];
  for (const [abbrev, prices] of pricesByTeam) {
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    result.push({ abbrev, name: getTeamName(abbrev), price: avg });
  }

  // Diagnostic temporaire : si l'API a bien renvoyé des cotes mais qu'aucune
  // n'a pu être associée à une équipe connue, c'est un problème de mapping
  // de noms (pas un problème de marché fermé) — on le rend visible.
  if (result.length === 0 && events.length > 0) {
    const sample = Array.from(unmatchedNames).slice(0, 5).join(", ");
    throw new Error(
      `Cotes reçues (${outcomeCount} résultats) mais aucune équipe reconnue. Exemples de noms non reconnus : ${sample || "(aucun nom)"}`,
    );
  }

  return result.sort((a, b) => a.price - b.price);
}

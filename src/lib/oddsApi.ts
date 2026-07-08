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

  const res = await fetch(
    `https://api.the-odds-api.com/v4/sports/icehockey_nhl/odds?apiKey=${apiKey}&regions=eu&markets=outrights`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) {
    throw new Error(`Erreur The Odds API: ${res.status}`);
  }

  const events: OddsApiEvent[] = await res.json();

  const pricesByTeam = new Map<string, number[]>();
  for (const event of events) {
    for (const bookmaker of event.bookmakers) {
      for (const market of bookmaker.markets) {
        if (market.key !== "outrights") continue;
        for (const outcome of market.outcomes) {
          const abbrev = getAbbrevByName(outcome.name);
          if (!abbrev) continue;
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

  return result.sort((a, b) => a.price - b.price);
}

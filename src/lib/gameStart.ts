import { isMagnusGameId } from "./competition";
import { getSeasonSchedule } from "./magnus";
import { getUpcomingGames } from "./nhl";
import { nhlFetch } from "./nhlFetch";

type NhlLandingStart = {
  startTimeUTC?: string;
  gameState?: string;
};

// - "open"        : la source confirme que le match n'a pas commencé.
// - "closed"      : la source dit que le match est lancé, fini, provisoire
//                   ou inexistant — le pronostic doit être refusé.
// - "unavailable" : la source n'a pas répondu (API NHL / Ligue Magnus en
//                   panne ou lente).
export type OfficialStart =
  | { status: "open"; startTimeUTC: string }
  | { status: "closed" }
  | { status: "unavailable" };

const OPEN_NHL_STATES = new Set(["FUT", "PRE"]);

async function fetchNhlLanding(gameId: number): Promise<Response> {
  return nhlFetch(`gamecenter/${gameId}/landing`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(5000),
  });
}

async function nhlStart(gameId: number): Promise<OfficialStart> {
  // Calendrier de la semaine déjà en cache (le même que l'onglet Matchs) :
  // couvre presque tous les pronostics sans appel réseau supplémentaire.
  const upcoming = await getUpcomingGames().catch(() => []);
  const cached = upcoming.find((g) => g.id === gameId);
  if (cached) {
    return OPEN_NHL_STATES.has(cached.gameState)
      ? { status: "open", startTimeUTC: cached.startTimeUTC }
      : { status: "closed" };
  }

  // Match plus lointain (ou déjà joué) : on interroge la fiche du match,
  // avec un second essai car l'API NHL coupe parfois une connexion.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchNhlLanding(gameId);
      if (res.status === 404) return { status: "closed" };
      if (!res.ok) continue;
      const data: NhlLandingStart = await res.json();
      if (!data.startTimeUTC || !OPEN_NHL_STATES.has(data.gameState ?? "")) {
        return { status: "closed" };
      }
      return { status: "open", startTimeUTC: data.startTimeUTC };
    } catch {
      // Erreur réseau ou délai dépassé : on retente, puis "unavailable".
    }
  }
  return { status: "unavailable" };
}

async function magnusStart(gameId: number): Promise<OfficialStart> {
  let games;
  try {
    games = await getSeasonSchedule();
  } catch {
    return { status: "unavailable" };
  }
  const game = games.find((g) => g.id === gameId);
  if (!game || game.isProvisional || game.gameState !== "FUT") {
    return { status: "closed" };
  }
  return { status: "open", startTimeUTC: game.startTimeUTC };
}

// Heure de coup d'envoi officielle d'un match, lue à la source (API NHL ou
// calendrier Ligue Magnus) plutôt que celle envoyée par le formulaire, qu'un
// joueur pourrait modifier pour pronostiquer un match déjà commencé.
export function getOfficialStart(gameId: number): Promise<OfficialStart> {
  return isMagnusGameId(gameId) ? magnusStart(gameId) : nhlStart(gameId);
}

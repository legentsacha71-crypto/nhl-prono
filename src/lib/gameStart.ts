import { isMagnusGameId } from "./competition";
import { getSeasonSchedule } from "./magnus";

type NhlLandingStart = {
  startTimeUTC?: string;
  gameState?: string;
};

// Heure de coup d'envoi officielle d'un match, lue à la source (API NHL ou
// calendrier Ligue Magnus) — jamais celle envoyée par le formulaire, qu'un
// joueur pourrait modifier pour pronostiquer un match déjà commencé, voire
// terminé. Renvoie null si le match est introuvable, déjà lancé côté
// source, ou seulement provisoire (id synthétique, voir MagnusGame) : dans
// tous ces cas le pronostic doit être refusé.
export async function getOfficialStartTime(
  gameId: number,
): Promise<string | null> {
  if (isMagnusGameId(gameId)) {
    const games = await getSeasonSchedule();
    const game = games.find((g) => g.id === gameId);
    if (!game || game.isProvisional || game.gameState !== "FUT") return null;
    return game.startTimeUTC;
  }

  const res = await fetch(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) return null;

  const data: NhlLandingStart = await res.json();
  if (!data.startTimeUTC) return null;
  if (data.gameState !== "FUT" && data.gameState !== "PRE") return null;
  return data.startTimeUTC;
}

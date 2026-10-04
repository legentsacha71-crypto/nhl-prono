import { SELECTABLE_MAGNUS_TEAMS } from "./magnusTeams";

// Scores Ligue Magnus d'après Flashscore. Le site de la ligue cesse parfois
// de saisir le score en cours de match, ou tarde à valider le résultat : le
// 2026-10-04, Chamonix–Nice y restait à 2-1 « en pause » alors que le match
// était fini à 6-3 depuis un quart d'heure, résultat déjà sur Flashscore.
// Servent : 1) au direct (/api/live), 2) à noter un match terminé que la
// ligue n'a pas encore validé (magnusResults.ts). Vérifié le 2026-10-04 :
// sur les 45 matchs terminés de la saison, score après 60 min identique à
// la ligue dans 100 % des cas.
//
// Flux non documenté (celui de flashscore.fr) : tous les matchs de hockey
// d'un jour, au format "~AA÷id¬AE÷domicile¬...". Il peut changer sans
// prévenir : toute erreur fait simplement retomber sur la source officielle.
// Jour relatif à aujourd'hui (0, -1...), fuseau UTC+2 comme flashscore.fr.
const feedUrl = (dayOffset: number) =>
  `https://16.flashscore.ninja/16/x/feed/f_4_${dayOffset}_2_fr_1`;
const FEED_SIGN = "SW9D1eZo";
const MAGNUS_LEAGUE = "FRANCE: Ligue Magnus";

export type FlashscoreGame = {
  homeAbbrev: string;
  awayAbbrev: string;
  startTimeMs: number;
  state: "SCHEDULED" | "LIVE" | "OFF";
  home: number | null;
  away: number | null;
  detail?: string;
  // Score à la fin des 60 minutes (somme des 3 périodes), seulement pour un
  // match terminé dont les scores de période sont complets et cohérents.
  regulation?: { home: number; away: number };
};

// Premier mot du nom, sans accents ni casse : "Chamonix Mont-Blanc" et
// "Chamonix" donnent tous deux "chamonix", "Briancon" et "Briançon"
// "briancon". Les premiers mots des 12 clubs sont tous différents.
function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[\s-]+/)[0];
}

const ABBREV_BY_KEY = new Map(
  SELECTABLE_MAGNUS_TEAMS.map((t) => [nameKey(t.name), t.abbrev]),
);

// Codes de statut Flashscore (champ AC) relevés le 2026-10-04 en les
// comparant à des matchs dont l'état réel était connu.
function detailFor(code: string, minute: string | undefined): string | undefined {
  const atMinute = minute ? ` · ${minute}e min` : "";
  switch (code) {
    case "14":
      return `1re période${atMinute}`;
    case "15":
      return `2e période${atMinute}`;
    case "16":
      return `3e période${atMinute}`;
    case "46":
      return "Entracte";
    case "6":
      return "Prolongation";
    case "7":
      return "Tirs au but";
    default:
      return undefined;
  }
}

function parseFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const part of block.split("¬")) {
    const sep = part.indexOf("÷");
    if (sep > 0) {
      const key = part.slice(0, sep);
      if (!(key in fields)) fields[key] = part.slice(sep + 1);
    }
  }
  return fields;
}

// Score après 60 min d'un match terminé : somme des 3 périodes. Pour un
// match fini dans le temps réglementaire (code 3), elle doit retomber sur le
// score final ; sinon (prolongation, tirs au but) seul le total des périodes
// compte, comme pour la notation officielle.
function regulationOf(
  f: Record<string, string>,
): { home: number; away: number } | undefined {
  const periods = ["BA", "BB", "BC", "BD", "BE", "BF"].map((k) =>
    f[k] === undefined ? NaN : Number(f[k]),
  );
  if (periods.some((n) => !Number.isInteger(n))) return undefined;
  const home = periods[0] + periods[2] + periods[4];
  const away = periods[1] + periods[3] + periods[5];
  if (f.AC === "3" && (Number(f.AG) !== home || Number(f.AH) !== away)) {
    return undefined;
  }
  return { home, away };
}

async function fetchMagnusGames(
  dayOffset: number,
  init: RequestInit,
): Promise<FlashscoreGame[]> {
  const res = await fetch(feedUrl(dayOffset), {
    ...init,
    headers: {
      "x-fsign": FEED_SIGN,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const text = await res.text();

  const games: FlashscoreGame[] = [];
  let league = "";
  for (const block of text.split("~")) {
    if (block.startsWith("ZA÷")) {
      league = block.slice(3).split("¬")[0];
      continue;
    }
    if (!block.startsWith("AA÷") || league !== MAGNUS_LEAGUE) continue;

    const f = parseFields(block);
    const homeAbbrev = ABBREV_BY_KEY.get(nameKey(f.AE ?? ""));
    const awayAbbrev = ABBREV_BY_KEY.get(nameKey(f.AF ?? ""));
    if (!homeAbbrev || !awayAbbrev) continue;

    const state = f.AB === "2" ? "LIVE" : f.AB === "3" ? "OFF" : "SCHEDULED";
    const home = f.AG !== undefined ? Number(f.AG) : null;
    const away = f.AH !== undefined ? Number(f.AH) : null;
    games.push({
      homeAbbrev,
      awayAbbrev,
      startTimeMs: Number(f.AD) * 1000,
      state,
      home: Number.isFinite(home) ? home : null,
      away: Number.isFinite(away) ? away : null,
      detail: state === "LIVE" ? detailFor(f.AC ?? "", f.BX) : undefined,
      regulation: state === "OFF" ? regulationOf(f) : undefined,
    });
  }
  return games;
}

// Matchs Magnus du jour, sans cache (direct).
export function getFlashscoreMagnusGames(): Promise<FlashscoreGame[]> {
  return fetchMagnusGames(0, { cache: "no-store" });
}

const PARIS_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });
const DAY_MS = 24 * 60 * 60 * 1000;

// Score après 60 min d'un match terminé d'après Flashscore, ou null si le
// match n'y est pas (encore) terminé ou introuvable. `settled` (affichage
// d'un prono déjà noté, pages profil) : lecture en cache ; sinon (notation)
// lecture fraîche, une seule fois par match non validé toutes les 5 min.
export async function getFlashscoreMagnusRegulation(
  homeAbbrev: string,
  awayAbbrev: string,
  startTimeUTC: string,
  { settled = false }: { settled?: boolean } = {},
): Promise<{ home: number; away: number } | null> {
  const start = new Date(startTimeUTC);
  const dayOffset = Math.round(
    (Date.parse(PARIS_DAY.format(start)) - Date.parse(PARIS_DAY.format(new Date()))) /
      DAY_MS,
  );
  if (dayOffset > 0 || dayOffset < -6) return null;

  const games = await fetchMagnusGames(
    dayOffset,
    settled ? { next: { revalidate: 3600 } } : { cache: "no-store" },
  );
  const game = games.find(
    (g) =>
      g.homeAbbrev === homeAbbrev &&
      g.awayAbbrev === awayAbbrev &&
      Math.abs(g.startTimeMs - start.getTime()) < 3 * 60 * 60 * 1000,
  );
  return game?.state === "OFF" && game.regulation ? game.regulation : null;
}

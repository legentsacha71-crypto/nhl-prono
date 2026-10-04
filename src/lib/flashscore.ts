import { SELECTABLE_MAGNUS_TEAMS } from "./magnusTeams";

// Scores en direct de la Ligue Magnus d'après Flashscore, pour l'AFFICHAGE
// uniquement (la notation reste sur le résultat officiel de la ligue, voir
// magnusResults.ts). Le site de la ligue cesse parfois de saisir le score en
// cours de match : le 2026-10-04, Chamonix–Nice y restait à 2-1 « en pause »
// alors que le match était fini à 6-3 depuis un quart d'heure, résultat déjà
// affiché par Flashscore.
//
// Flux non documenté (celui de flashscore.fr) : tous les matchs de hockey du
// jour, au format "~AA÷id¬AE÷domicile¬...". Il peut changer sans prévenir :
// toute erreur fait simplement retomber sur la source officielle.
const FEED_URL = "https://16.flashscore.ninja/16/x/feed/f_4_0_2_fr_1";
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
};

// Premier mot du nom, sans accents ni casse : "Chamonix Mont-Blanc" et
// "Chamonix" donnent tous deux "chamonix", "Briancon" et "Briançon"
// "briancon". Les premiers mots des 12 clubs sont tous différents.
function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

export async function getFlashscoreMagnusGames(): Promise<FlashscoreGame[]> {
  const res = await fetch(FEED_URL, {
    headers: {
      "x-fsign": FEED_SIGN,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
    },
    cache: "no-store",
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
    });
  }
  return games;
}

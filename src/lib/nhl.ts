export type NhlGame = {
  id: number;
  startTimeUTC: string;
  gameState: string;
  awayTeam: { abbrev: string; name: string };
  homeTeam: { abbrev: string; name: string };
};

type NhlTeam = {
  abbrev: string;
  commonName: { default: string };
  placeName: { default: string };
};

type NhlApiGame = {
  id: number;
  startTimeUTC: string;
  gameState: string;
  awayTeam: NhlTeam;
  homeTeam: NhlTeam;
};

type NhlScheduleResponse = {
  gameWeek: { games: NhlApiGame[] }[];
  regularSeasonStartDate: string;
};

function toGame(g: NhlApiGame): NhlGame {
  return {
    id: g.id,
    startTimeUTC: g.startTimeUTC,
    gameState: g.gameState,
    awayTeam: {
      abbrev: g.awayTeam.abbrev,
      name: `${g.awayTeam.placeName.default} ${g.awayTeam.commonName.default}`,
    },
    homeTeam: {
      abbrev: g.homeTeam.abbrev,
      name: `${g.homeTeam.placeName.default} ${g.homeTeam.commonName.default}`,
    },
  };
}

export async function getUpcomingGames(): Promise<NhlGame[]> {
  const res = await fetch("https://api-web.nhle.com/v1/schedule/now", {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Erreur API NHL: ${res.status}`);
  }

  const data: NhlScheduleResponse = await res.json();
  const now = Date.now();

  return data.gameWeek
    .flatMap((day) => day.games)
    .filter((g) => new Date(g.startTimeUTC).getTime() > now)
    .map(toGame);
}

// Tant que le calendrier de la nouvelle saison n'est pas publié, l'API
// renvoie encore la date de la saison précédente (donc déjà passée) :
// dans ce cas on retourne null plutôt qu'un compte à rebours cassé.
export async function getRegularSeasonStartDate(): Promise<string | null> {
  const res = await fetch("https://api-web.nhle.com/v1/schedule/now", {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Erreur API NHL: ${res.status}`);
  }

  const data: NhlScheduleResponse = await res.json();

  if (new Date(data.regularSeasonStartDate).getTime() <= Date.now()) {
    return null;
  }

  return data.regularSeasonStartDate;
}

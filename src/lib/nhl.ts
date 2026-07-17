export type NhlGame = {
  id: number;
  startTimeUTC: string;
  gameState: string;
  awayTeam: { abbrev: string; name: string; score?: number };
  homeTeam: { abbrev: string; name: string; score?: number };
};

type NhlTeam = {
  abbrev: string;
  commonName: { default: string };
  placeName: { default: string };
  score?: number;
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
  regularSeasonEndDate: string;
};

function toGame(g: NhlApiGame): NhlGame {
  return {
    id: g.id,
    startTimeUTC: g.startTimeUTC,
    gameState: g.gameState,
    awayTeam: {
      abbrev: g.awayTeam.abbrev,
      name: `${g.awayTeam.placeName.default} ${g.awayTeam.commonName.default}`,
      score: g.awayTeam.score,
    },
    homeTeam: {
      abbrev: g.homeTeam.abbrev,
      name: `${g.homeTeam.placeName.default} ${g.homeTeam.commonName.default}`,
      score: g.homeTeam.score,
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

// Récupère tous les matchs de la saison régulière (environ 1300 matchs)
// pour l'onglet "Calendrier". L'API NHL ne renvoie qu'une semaine glissante
// de 7 jours par appel (endpoint /schedule/{date}) : plutôt que d'enchaîner
// les appels un par un en suivant nextStartDate (lent), on calcule
// nous-mêmes toutes les dates de début de semaine entre le début et la fin
// de saison régulière, puis on lance tous les appels en parallèle.
export async function getSeasonSchedule(): Promise<NhlGame[]> {
  const res = await fetch("https://api-web.nhle.com/v1/schedule/now", {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Erreur API NHL: ${res.status}`);
  }

  const data: NhlScheduleResponse = await res.json();

  if (!data.regularSeasonStartDate || !data.regularSeasonEndDate) {
    return [];
  }

  const weekStartDates: string[] = [];
  const cursor = new Date(`${data.regularSeasonStartDate}T00:00:00Z`);
  const end = new Date(`${data.regularSeasonEndDate}T00:00:00Z`);
  while (cursor.getTime() <= end.getTime()) {
    weekStartDates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  const weeks = await Promise.all(
    weekStartDates.map(async (date) => {
      const weekRes = await fetch(
        `https://api-web.nhle.com/v1/schedule/${date}`,
        { next: { revalidate: 3600 } },
      );
      if (!weekRes.ok) return [];
      const weekData: NhlScheduleResponse = await weekRes.json();
      return weekData.gameWeek.flatMap((day) => day.games);
    }),
  );

  return weeks
    .flat()
    .map(toGame)
    .sort(
      (a, b) =>
        new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime(),
    );
}

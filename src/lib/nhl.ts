export type NhlGame = {
  id: number;
  startTimeUTC: string;
  gameState: string;
  awayTeam: { abbrev: string; name: string; logo: string };
  homeTeam: { abbrev: string; name: string; logo: string };
};

type NhlTeam = {
  abbrev: string;
  logo: string;
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
};

function toGame(g: NhlApiGame): NhlGame {
  return {
    id: g.id,
    startTimeUTC: g.startTimeUTC,
    gameState: g.gameState,
    awayTeam: {
      abbrev: g.awayTeam.abbrev,
      name: `${g.awayTeam.placeName.default} ${g.awayTeam.commonName.default}`,
      logo: g.awayTeam.logo,
    },
    homeTeam: {
      abbrev: g.homeTeam.abbrev,
      name: `${g.homeTeam.placeName.default} ${g.homeTeam.commonName.default}`,
      logo: g.homeTeam.logo,
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

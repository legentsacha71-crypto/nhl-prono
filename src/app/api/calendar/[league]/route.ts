import { NextResponse } from "next/server";
import { getSeasonSchedule as getNhlSeasonSchedule } from "@/lib/nhl";
import { getSeasonSchedule as getMagnusSeasonSchedule } from "@/lib/magnus";
import { toCalendarMonths } from "@/lib/calendarMonths";

// Calendrier complet de la saison d'une compétition, demandé par
// CalendarMonths à l'ouverture de l'onglet "Calendrier" de la page Matchs
// plutôt qu'envoyé à chaque visite. Données publiques (aucune donnée de
// joueur) : le navigateur peut les garder une minute.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ league: string }> },
) {
  const { league } = await params;
  if (league !== "nhl" && league !== "magnus") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const games =
      league === "nhl"
        ? await getNhlSeasonSchedule()
        : await getMagnusSeasonSchedule();
    return NextResponse.json(toCalendarMonths(games), {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err) {
    console.error(`Calendrier ${league} indisponible :`, err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

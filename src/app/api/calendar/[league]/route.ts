import { NextResponse } from "next/server";
import { getSeasonSchedule as getNhlSeasonSchedule } from "@/lib/nhl";
import { getSeasonSchedule as getMagnusSeasonSchedule } from "@/lib/magnus";
import { toCalendarMonths } from "@/lib/calendarMonths";

// Calendrier complet de la saison d'une compétition, demandé par
// CalendarMonths à l'ouverture de l'onglet "Calendrier" de la page Matchs
// plutôt qu'envoyé à chaque visite. Données publiques (aucune donnée de
// joueur, route exclue du proxy de session) : gardées 2 min par le CDN de
// Vercel, servies encore 10 min pendant leur rafraîchissement en arrière-plan.
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
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error(`Calendrier ${league} indisponible :`, err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

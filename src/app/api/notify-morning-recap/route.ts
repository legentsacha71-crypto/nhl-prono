import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { loadAllNotifPrefs, sendPushToUser } from "@/lib/push";
import { pushAllowed } from "@/lib/notifPrefs";
import { bestRankMove, leaguesOf, snapshotLeagues } from "@/lib/leagueMoves";
import { parisClock, parisLastNightStart } from "@/lib/rankingWeek";

// Récap du matin : à 9 h (heure de Paris), chaque joueur qui a eu des
// pronos notés cette nuit reçoit ses points, ses bons pronos et son plus
// gros mouvement dans ses ligues. Appelé par le cron Supabase à 7 h et 8 h
// UTC (voir supabase/cron_jobs.sql) : selon l'heure d'été ou d'hiver, un
// seul des deux appels tombe à 9 h à Paris, l'autre est ignoré. Pas de
// table de déduplication : un seul appel par jour dans la fenêtre.
//
// Test : `?user=<id>` limite l'envoi à ce joueur, à n'importe quelle heure ;
// `&dry=1` renvoie le message sans rien envoyer.
const TARGET_HOUR = 9;
const WINDOW_MINUTES = 15;
const PAGE = 1000;

type NightTotals = { points: number; count: number; good: number; exact: number };

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

function recapBody(t: NightTotals, move: string | null): string {
  const good =
    t.good === 0 ? `aucun bon prono sur ${t.count}` : `${plural(t.good, "bon prono")} sur ${t.count}`;
  const exact = t.exact > 0 ? `, ${plural(t.exact, "score exact")} 🎯` : "";
  const line = `+${t.points} pts cette nuit : ${good}${exact}.`;
  return move ? `${line} ${move}` : line;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const onlyUser = request.nextUrl.searchParams.get("user");
  const dry = request.nextUrl.searchParams.get("dry") === "1";
  const now = new Date();
  const { hour, minute } = parisClock(now);
  if (!onlyUser && (hour !== TARGET_HOUR || minute >= WINDOW_MINUTES)) {
    return NextResponse.json({ skipped: true, reason: "hors fenêtre 9h" });
  }

  const supabase = createAdminClient();
  const nightStart = parisLastNightStart(now);

  // Joueurs joignables : un appareil enregistré et le récap pas coupé.
  const [{ data: tokenRows }, prefs] = await Promise.all([
    supabase.from("device_push_tokens").select("user_id"),
    loadAllNotifPrefs(),
  ]);
  const reachable = new Set(
    (tokenRows ?? [])
      .map((r) => r.user_id as string)
      .filter((id) => (!onlyUser || id === onlyUser) && pushAllowed(prefs.get(id), "recap")),
  );
  if (reachable.size === 0) return NextResponse.json({ notified: 0 });

  // Pronos notés des matchs de la nuit, par paquets (limite de 1000 lignes).
  const totals = new Map<string, NightTotals>();
  const userIds = [...reachable];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("predictions")
      .select("user_id, points, is_exact_score")
      .in("user_id", userIds)
      .not("points", "is", null)
      .gte("game_start_time", nightStart.toISOString())
      .lt("game_start_time", now.toISOString())
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const row of data ?? []) {
      const t = totals.get(row.user_id) ?? { points: 0, count: 0, good: 0, exact: 0 };
      t.points += Number(row.points);
      t.count += 1;
      if (Number(row.points) > 0) t.good += 1;
      if (row.is_exact_score) t.exact += 1;
      totals.set(row.user_id, t);
    }
    if (!data || data.length < PAGE) break;
  }

  const players = [...totals.keys()];
  if (players.length === 0) return NextResponse.json({ notified: 0 });

  // Classements des ligues avant la nuit et maintenant.
  const leagues = await leaguesOf(supabase, players);
  const [before, after] = await Promise.all([
    snapshotLeagues(supabase, leagues, nightStart),
    snapshotLeagues(supabase, leagues),
  ]);

  const messages: { userId: string; body: string }[] = [];
  for (const userId of players) {
    const body = recapBody(totals.get(userId)!, bestRankMove(leagues, before, after, userId));
    messages.push({ userId, body });
  }

  if (dry) return NextResponse.json({ dry: true, messages });

  let notified = 0;
  for (const { userId, body } of messages) {
    try {
      await sendPushToUser(
        userId,
        { title: "☀️ Ta nuit de pronos", body, url: "/notifications" },
        "recap",
        prefs.get(userId) ?? {},
      );
      notified++;
    } catch (err) {
      console.error(`Échec du récap du matin pour user ${userId}:`, err);
    }
  }
  return NextResponse.json({ notified });
}

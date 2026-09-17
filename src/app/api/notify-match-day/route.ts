import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getUpcomingGames as getNhlUpcomingGames } from "@/lib/nhl";
import { getUpcomingGames as getMagnusUpcomingGames } from "@/lib/magnus";
import { sendPushToUser } from "@/lib/push";

// Le déclenchement externe (GitHub Actions, cron toutes les ~15 min en UTC)
// ne tombe jamais exactement sur 13h00 heure de Paris à la minute près :
// on élargit donc à 13h00-13h14, une seule des exécutions quotidiennes du
// cron tombant dans cette fenêtre. Contrairement à game_reminders_sent (le
// rappel à H-1), pas besoin de table de déduplication ici : un passage de
// cron en retard/raté un jour donné fait juste sauter la notif ce jour-là,
// jamais un double envoi (la fenêtre ne repasse que 24h plus tard).
const TARGET_HOUR = 13;
const WINDOW_MINUTES = 15;

function parisNow(): { hour: number; minute: number; dateKey: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dateKey: `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`,
  };
}

function parisDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    new Date(iso),
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { hour, minute, dateKey } = parisNow();
  if (hour !== TARGET_HOUR || minute >= WINDOW_MINUTES) {
    return NextResponse.json({ skipped: true, reason: "hors fenêtre 13h" });
  }

  const [nhlGames, magnusGames] = await Promise.all([
    getNhlUpcomingGames(),
    getMagnusUpcomingGames(),
  ]);

  // Matchs qui se jouent ce soir : même jour calendaire que "maintenant",
  // heure de Paris.
  const tonightGames = [...nhlGames, ...magnusGames].filter(
    (g) => parisDateKey(g.startTimeUTC) === dateKey,
  );

  if (tonightGames.length === 0) {
    return NextResponse.json({
      skipped: true,
      reason: "aucun match ce soir",
    });
  }

  const supabase = createAdminClient();
  const gameIds = tonightGames.map((g) => g.id);

  // On ne relance pas les joueurs qui ont déjà pronostiqué au moins un
  // match de ce soir — le rappel sert à ne pas oublier, pas à harceler
  // quelqu'un qui a déjà commencé.
  const [{ data: tokenRows }, { data: predictionRows }] = await Promise.all([
    supabase.from("device_push_tokens").select("user_id"),
    supabase.from("predictions").select("user_id").in("game_id", gameIds),
  ]);

  const alreadyPredicted = new Set(
    (predictionRows ?? []).map((r) => r.user_id),
  );
  const candidates = new Set((tokenRows ?? []).map((r) => r.user_id));
  const targets = [...candidates].filter(
    (userId) => !alreadyPredicted.has(userId),
  );

  let notified = 0;
  for (const userId of targets) {
    try {
      await sendPushToUser(userId, {
        title: "🏒 Matchs ce soir",
        body: "N'oublie pas tes matchs de ce soir 👀 !",
      });
      notified++;
    } catch (err) {
      console.error(`Échec du rappel quotidien pour user ${userId}:`, err);
    }
  }

  return NextResponse.json({ games: tonightGames.length, notified });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getUpcomingGames } from "@/lib/nhl";
import { sendPushToUser } from "@/lib/apns";

// Fenêtre autour de "1h avant le match" : le déclenchement externe (GitHub
// Actions, cron toutes les ~15 min) n'appelle jamais exactement à H-60, donc
// on élargit la cible à H-70/H-50 pour être sûr d'attraper chaque match au
// moins une fois. La table game_reminders_sent empêche qu'un même match
// déclenche plusieurs rappels au même joueur si plusieurs passages du cron
// tombent dans la fenêtre.
const WINDOW_MIN_MS = 50 * 60 * 1000;
const WINDOW_MAX_MS = 70 * 60 * 1000;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = Date.now();

  const games = (await getUpcomingGames()).filter((g) => {
    const delta = new Date(g.startTimeUTC).getTime() - now;
    return delta >= WINDOW_MIN_MS && delta <= WINDOW_MAX_MS;
  });

  let notified = 0;

  for (const game of games) {
    const [{ data: tokenRows }, { data: predictionRows }, { data: sentRows }] =
      await Promise.all([
        supabase.from("device_push_tokens").select("user_id"),
        supabase.from("predictions").select("user_id").eq("game_id", game.id),
        supabase
          .from("game_reminders_sent")
          .select("user_id")
          .eq("game_id", game.id),
      ]);

    const predicted = new Set((predictionRows ?? []).map((r) => r.user_id));
    const alreadySent = new Set((sentRows ?? []).map((r) => r.user_id));
    const candidates = new Set((tokenRows ?? []).map((r) => r.user_id));

    const targets = [...candidates].filter(
      (userId) => !predicted.has(userId) && !alreadySent.has(userId),
    );

    for (const userId of targets) {
      try {
        await sendPushToUser(userId, {
          title: "Pronostic bientôt verrouillé",
          body: `${game.awayTeam.abbrev} @ ${game.homeTeam.abbrev} commence dans 1h — fais ton pronostic avant le verrouillage !`,
        });
        await supabase
          .from("game_reminders_sent")
          .insert({ user_id: userId, game_id: game.id });
        notified++;
      } catch (err) {
        console.error(
          `Échec du rappel pour user ${userId}, match ${game.id}:`,
          err,
        );
      }
    }
  }

  return NextResponse.json({ games: games.length, notified });
}

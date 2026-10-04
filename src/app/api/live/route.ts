import { NextResponse } from "next/server";
import { nhlFetch } from "@/lib/nhlFetch";
import {
  getAllSeasonMatches,
  getCurrentCompetitionId,
  isMatchAssigned,
  parisLocalToUTC,
} from "@/lib/magnusApi";
import type { LiveGame, LiveScores } from "@/lib/liveTypes";

// Scores en direct des matchs du jour (NHL + Ligue Magnus), interrogés par
// l'onglet Matchs toutes les 15 s pendant qu'un match est en cours. Les
// sources sont lues sans cache ; c'est la réponse de cette route qui est
// gardée 15 s par le CDN de Vercel, pour que les API NHL / Ligue Magnus ne
// soient pas appelées plus de quelques fois par minute quel que soit le
// nombre de joueurs connectés. Données publiques : route exclue du proxy de
// session (voir src/proxy.ts).

type NhlScoreGame = {
  id: number;
  gameState: string;
  homeTeam: { score?: number };
  awayTeam: { score?: number };
  periodDescriptor?: { number?: number; periodType?: string };
  clock?: { timeRemaining?: string; inIntermission?: boolean };
};

function nhlDetail(g: NhlScoreGame): string | undefined {
  if (g.clock?.inIntermission) return "Entracte";
  const type = g.periodDescriptor?.periodType;
  if (type === "OT") return `Prolongation · ${g.clock?.timeRemaining ?? ""}`.trim();
  if (type === "SO") return "Tirs au but";
  const n = g.periodDescriptor?.number;
  if (!n) return undefined;
  return `${n}${n === 1 ? "re" : "e"} période${g.clock?.timeRemaining ? ` · ${g.clock.timeRemaining}` : ""}`;
}

async function nhlLive(): Promise<LiveScores> {
  const res = await nhlFetch("score/now", { cache: "no-store" });
  if (!res.ok) return {};
  const data: { games?: NhlScoreGame[] } = await res.json();
  const out: LiveScores = {};
  for (const g of data.games ?? []) {
    const live = g.gameState === "LIVE" || g.gameState === "CRIT";
    const done = g.gameState === "OFF" || g.gameState === "FINAL";
    if (!live && !done) continue;
    out[g.id] = {
      state: live ? "LIVE" : "OFF",
      home: g.homeTeam.score ?? 0,
      away: g.awayTeam.score ?? 0,
      detail: live ? nhlDetail(g) : undefined,
    };
  }
  return out;
}

// Fenêtre de recherche après le coup d'envoi : au-delà, un match que la
// ligue n'a pas clos n'est plus considéré en cours (même règle que
// ASSUMED_LIVE_MS dans magnus.ts).
const MAGNUS_LIVE_MS = 5 * 60 * 60 * 1000;
const MAGNUS_RECENT_MS = 8 * 60 * 60 * 1000;

async function magnusLive(): Promise<LiveScores> {
  const competitionId = await getCurrentCompetitionId();
  if (!competitionId) return {};
  const matches = await getAllSeasonMatches(competitionId, 0);
  const now = Date.now();
  const out: LiveScores = {};

  for (const m of matches) {
    if (!isMatchAssigned(m)) continue;
    const since = now - new Date(parisLocalToUTC(m.date_rencontre)).getTime();
    if (since < 0 || since > MAGNUS_RECENT_MS) continue;
    const home = m.score.find((s) => s.equipe_id === m.receveur.id)?.score ?? 0;
    const away = m.score.find((s) => s.equipe_id === m.visiteur.id)?.score ?? 0;
    if (m.etat === "T") {
      out[m.id] = { state: "OFF", home, away };
    } else if (m.etat === "E") {
      out[m.id] = { state: "LIVE", home, away };
    } else if (since < MAGNUS_LIVE_MS) {
      // Commencé mais pas passé "en cours" par la ligue : pas de score.
      out[m.id] = { state: "LIVE", home: null, away: null };
    }
  }
  return out;
}

export async function GET() {
  const [nhl, magnus] = await Promise.all([
    nhlLive().catch(() => ({}) as LiveScores),
    magnusLive().catch(() => ({}) as LiveScores),
  ]);
  const body: Record<string, LiveGame> = { ...nhl, ...magnus };
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=15",
    },
  });
}

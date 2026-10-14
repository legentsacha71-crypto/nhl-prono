import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";

// Recherche de joueurs par pseudo pour la page Mes amis (FriendSearch.tsx) :
// quelques suggestions dès 2 lettres, plutôt que de devoir connaître le
// pseudo exact.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 30);
  if (q.length < 2) return NextResponse.json({ players: [] });

  // % et _ sont des jokers pour ilike : on les neutralise.
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .ilike("username", pattern)
    .neq("id", user.id)
    .order("username")
    .limit(8);

  return NextResponse.json(
    {
      players: (data ?? []).map((p) => ({
        id: p.id as string,
        username: p.username as string,
        avatarUrl: (p.avatar_url as string | null) ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

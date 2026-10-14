import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import { loadMessages } from "@/lib/leagueChat";

// Nouveaux messages d'une ligue depuis `after`, interrogée toutes les
// quelques secondes par le chat ouvert (LeagueChat.tsx).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });

  const after = request.nextUrl.searchParams.get("after") ?? undefined;
  const messages = await loadMessages(supabase, id, { after });
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}

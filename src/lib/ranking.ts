import { SupabaseClient } from "@supabase/supabase-js";

export type RankingEntry = {
  userId: string;
  username: string;
  totalPoints: number;
};

export async function getRanking(
  supabase: SupabaseClient,
  userIds?: string[],
): Promise<RankingEntry[]> {
  let profilesQuery = supabase.from("profiles").select("id, username");
  if (userIds) {
    profilesQuery = profilesQuery.in("id", userIds);
  }
  const { data: profiles } = await profilesQuery;

  let predictionsQuery = supabase
    .from("predictions")
    .select("user_id, points")
    .not("points", "is", null);
  if (userIds) {
    predictionsQuery = predictionsQuery.in("user_id", userIds);
  }
  const { data: predictions } = await predictionsQuery;

  const pointsByUser = new Map<string, number>();
  for (const p of predictions ?? []) {
    pointsByUser.set(
      p.user_id,
      (pointsByUser.get(p.user_id) ?? 0) + (p.points ?? 0),
    );
  }

  return (profiles ?? [])
    .map((profile) => ({
      userId: profile.id as string,
      username: profile.username as string,
      totalPoints: pointsByUser.get(profile.id) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

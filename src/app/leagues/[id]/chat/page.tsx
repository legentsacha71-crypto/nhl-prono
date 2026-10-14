import { redirect } from "next/navigation";

// Le chat est désormais un onglet de la page de la ligue : on garde cette
// adresse pour les anciens liens.
export default async function LeagueChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/leagues/${id}?tab=chat`);
}

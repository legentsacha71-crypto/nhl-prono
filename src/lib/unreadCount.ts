import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";

// Chaque page lance `void getUnreadCount()` dès sa première ligne : sans ça,
// la requête de TopBar ne partait qu'une fois la page revenue de ses propres
// requêtes, et s'ajoutait à la suite au lieu de se faire en parallèle.
// cache() rend à TopBar la même promesse au sein d'une même requête.
// Ne rejette jamais : lancée sans être attendue par les pages, une erreur
// ici serait un rejet non géré ; la pastille retombe simplement à 0.
export const getUnreadCount = cache(async (): Promise<number> => {
  try {
    const user = await getCurrentUser();
    if (!user) return 0;

    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
});

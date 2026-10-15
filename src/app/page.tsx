import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Racine : redirige vers le tableau de bord ou la connexion. */
export default async function RootPage() {
  if (!isSupabaseConfigured()) redirect("/installation");

  const user = await getCurrentUser();
  redirect(user ? ROUTES.dashboard : ROUTES.login);
}

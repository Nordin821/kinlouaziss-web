import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Rendu dynamique obligatoire : la session est vérifiée à chaque requête.
export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/installation");
  }

  const user = await getCurrentUser();
  if (user) redirect(ROUTES.dashboard);

  return <div className="min-h-screen bg-background">{children}</div>;
}

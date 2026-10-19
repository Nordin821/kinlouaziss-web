import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { signOut } from "@/app/actions/auth";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/dal";

// Rendu dynamique obligatoire : l'autorisation dépend des cookies de session
// et ne doit jamais être figée au moment du build.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  // Mot de passe provisoire imposé par un administrateur : tant qu'il n'a pas
  // été remplacé, l'utilisateur n'accède à aucune page de l'application.
  if (user.mustChangePassword) redirect(ROUTES.passwordReset);

  return (
    <AppShell user={user} role={user.role} onLogout={signOut}>
      {children}
    </AppShell>
  );
}

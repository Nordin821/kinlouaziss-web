import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { signOut } from "@/app/actions/auth";
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

  return (
    <AppShell user={user} role={user.role} onLogout={signOut}>
      {children}
    </AppShell>
  );
}

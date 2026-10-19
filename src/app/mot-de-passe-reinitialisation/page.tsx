import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/dal";

import { PasswordChoiceForm } from "./password-choice-form";

export const metadata = { title: "Nouveau mot de passe" };

// La page dépend de la session : elle ne doit jamais être figée au build.
export const dynamic = "force-dynamic";

/**
 * Premier choix de mot de passe après une réinitialisation par un
 * administrateur.
 *
 * Route **hors** des groupes `(auth)` et `(app)` : l'utilisateur est déjà
 * connecté (avec le mot de passe provisoire), mais le shell de l'application
 * lui est fermé tant qu'il n'a pas choisi son propre mot de passe — cf.
 * `src/app/(app)/layout.tsx`.
 */
export default async function PasswordResetPage() {
  const user = await requireUser();
  if (!user.mustChangePassword) redirect(ROUTES.dashboard);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <Brand />

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-muted-foreground">
            Un administrateur du cabinet a réinitialisé votre mot de passe.
            Choisissez-en un nouveau pour accéder à l&apos;application.
          </p>
        </div>

        <PasswordChoiceForm fullName={user.fullName} />
      </div>
    </div>
  );
}

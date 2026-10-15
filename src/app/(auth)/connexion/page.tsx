import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { APP_TAGLINE, ROUTES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/connexion">) {
  if (!isSupabaseConfigured()) redirect("/installation");

  const user = await getCurrentUser();
  if (user) redirect(ROUTES.dashboard);

  const params = await searchParams;
  const next = typeof params.suivant === "string" ? params.suivant : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Colonne de présentation */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white/15">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kinlouaziss_logo.png"
              alt="KinLouaziss"
              className="size-10 object-cover"
            />
          </span>
          <span className="text-lg font-semibold">KinLouaziss</span>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">{APP_TAGLINE}</h1>
          <p className="text-sm text-white/80">
            Gestion des patients, dossiers médicaux, rendez-vous, séances et
            facturation — accessible en ligne, depuis n&apos;importe quel poste
            du cabinet.
          </p>
        </div>
        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} KinLouaziss
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 lg:hidden">
            <Brand />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
            <p className="text-sm text-muted-foreground">
              Accédez à votre espace de gestion du cabinet.
            </p>
          </div>

          <LoginForm next={next} />

          <p className="text-center text-xs text-muted-foreground">
            Problème d&apos;accès ? Contactez votre administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { KeyRound, ServerCog } from "lucide-react";

import { Brand } from "@/components/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Installation" };

const STEPS = [
  {
    title: "1. Créer le projet Supabase",
    body: "Sur supabase.com, créez un projet gratuit et récupérez l'URL ainsi que la clé anonyme (Project Settings → API).",
  },
  {
    title: "2. Renseigner les variables d'environnement",
    body: "Copiez .env.example vers .env, puis collez DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  },
  {
    title: "3. Créer les tables et les données de référence",
    body: "Exécutez `npx prisma db push` puis `npm run db:seed` pour créer les rôles, permissions et le compte administrateur.",
  },
  {
    title: "4. Redémarrer l'application",
    body: "Relancez `npm run dev`, puis connectez-vous avec le compte administrateur créé par le seed.",
  },
];

/** Écran affiché tant que Supabase n'est pas configuré. */
export default function InstallationPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <Brand />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-warning">
        <ServerCog className="mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Application non configurée</p>
          <p>
            Les variables d&apos;environnement Supabase sont absentes. Suivez les
            étapes ci-dessous pour activer l&apos;application.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            Mise en route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {STEPS.map((step) => (
            <div key={step.title} className="space-y-1">
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            Consultez le fichier <code className="font-mono">README.md</code> du
            projet pour la procédure détaillée.{" "}
            <Link href="/connexion" className="font-medium text-primary">
              Aller à la connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl font-semibold text-primary">404</p>
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La page demandée n&apos;existe pas ou a été déplacée.
      </p>
      <Button asChild>
        <Link href="/tableau-de-bord">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}

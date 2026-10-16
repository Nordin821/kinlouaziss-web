"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bouton « Actualiser » qui relance le rendu serveur de la page courante.
 *
 * Équivalent web du bouton d'actualisation des listes de l'application desktop.
 */
export function RefreshButton({
  label = "Actualiser",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw className={cn(pending && "animate-spin")} />
      {label}
    </Button>
  );
}

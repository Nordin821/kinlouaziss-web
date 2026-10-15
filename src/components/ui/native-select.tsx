import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Sélecteur natif (`<select>`) au style de la charte.
 *
 * Préféré au sélecteur Radix pour les listes longues (patients, thérapeutes) :
 * il reste fluide avec des centaines d'options et soumet sa valeur
 * nativement dans un formulaire.
 */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

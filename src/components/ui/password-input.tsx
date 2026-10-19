"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";

/**
 * Champ mot de passe avec bascule d'affichage.
 *
 * `autoComplete="new-password"` est conservé pour les saisies de nouveau mot de
 * passe : il indique au gestionnaire de mots de passe de ne **pas** pré-remplir
 * le champ.
 */
export function PasswordInput({
  id,
  name,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  autoComplete: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

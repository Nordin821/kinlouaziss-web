"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { completeForcedPasswordChange } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { ROUTES } from "@/lib/constants";

export function PasswordChoiceForm({ fullName }: { fullName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData): Promise<void> {
    setError(null);
    setPending(true);
    try {
      const result = await completeForcedPasswordChange(formData);

      if (result && "error" in result) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Mot de passe enregistré.");
      // L'action a revalidé le layout : le contrôle `mustChangePassword` est
      // levé, l'application s'ouvre.
      router.push(ROUTES.dashboard);
      router.refresh();
    } catch {
      const message = "Une erreur est survenue. Réessayez.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
        Bonjour {fullName}, vous vous connectez avec un mot de passe
        provisoire.
      </p>

      <Field
        label="Nouveau mot de passe"
        htmlFor="newPassword"
        required
        hint="Au moins 8 caractères."
      >
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>

      <Field
        label="Confirmer le nouveau mot de passe"
        htmlFor="confirmPassword"
        required
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        <KeyRound />
        {pending ? "Enregistrement…" : "Choisir ce mot de passe"}
      </Button>
    </form>
  );
}

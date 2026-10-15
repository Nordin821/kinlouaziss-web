"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ActionState = { ok: true } | { error: string } | undefined;

/**
 * Formulaire de section d'un dossier médical.
 *
 * Reçoit une action serveur déjà liée au patient (`.bind(null, patientId)`),
 * affiche un bouton d'enregistrement et un retour utilisateur homogène.
 */
export function SectionForm({
  title,
  description,
  action,
  children,
  submitLabel = "Enregistrer",
  columnsClassName = "grid gap-4 sm:grid-cols-2",
}: {
  title: string;
  description?: string;
  action: (formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  columnsClassName?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await action(formData);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Modifications enregistrées.");
        router.refresh();
      }
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <form action={handleSubmit} className="space-y-4">
        <div className={columnsClassName}>{children}</div>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

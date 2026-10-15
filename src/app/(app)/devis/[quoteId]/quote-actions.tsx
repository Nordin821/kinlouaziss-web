"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { convertQuoteToInvoice, deleteQuote } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PatientOption } from "@/lib/options";

import { QuoteFormDialog, type QuoteFormData } from "../quote-form-dialog";

/** Barre d'actions de la page devis (masquée à l'impression). */
export function QuoteActions({
  quote,
  patients,
  canManage,
  canConvert,
}: {
  quote: QuoteFormData;
  patients: PatientOption[];
  canManage: boolean;
  canConvert: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteQuote(quote.id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Devis supprimé.");
        router.push("/devis");
      }
    });
  }

  function handleConvert() {
    startTransition(async () => {
      const result = await convertQuoteToInvoice(quote.id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Devis converti en facture.");
        router.refresh();
      }
    });
  }

  if (!canManage) return null;

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {canConvert && quote.status !== "accepted" ? (
        <Button onClick={handleConvert} disabled={pending}>
          <FilePlus2 />
          Convertir en facture
        </Button>
      ) : null}

      <QuoteFormDialog
        patients={patients}
        quote={quote}
        trigger={
          <Button variant="outline">
            <Pencil />
            Modifier
          </Button>
        }
      />

      <ConfirmDialog
        title="Supprimer le devis"
        description="Le devis sera retiré de la liste."
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleDelete}
        trigger={
          <Button variant="outline" disabled={pending} className="text-danger">
            <Trash2 />
            Supprimer
          </Button>
        }
      />
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCheck, FilePlus2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  convertQuoteToInvoice,
  deleteQuote,
  setQuoteStatus,
} from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PatientOption } from "@/lib/options";
import { QUOTE_STATUS_LABELS } from "@/lib/validations/quote";

import { QuoteFormDialog, type QuoteFormData } from "../quote-form-dialog";

/** Statuts proposés en raccourci depuis la page d'un devis. */
const QUICK_STATUSES = ["sent", "accepted", "rejected"] as const;

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

  function changeStatus(status: string, label: string) {
    startTransition(async () => {
      const result = await setQuoteStatus(quote.id, status);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(label);
        router.refresh();
      }
    });
  }

  if (!canManage) return null;

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={pending}>
            <FileCheck />
            Changer le statut
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {QUICK_STATUSES.filter((status) => status !== quote.status).map(
            (status) => (
              <DropdownMenuItem
                key={status}
                disabled={pending}
                onSelect={() =>
                  changeStatus(
                    status,
                    `Statut mis à jour : ${QUOTE_STATUS_LABELS[status].toLowerCase()}.`,
                  )
                }
              >
                {QUOTE_STATUS_LABELS[status]}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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

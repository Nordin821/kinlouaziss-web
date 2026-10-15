"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { deleteInvoice } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  InvoiceOption,
  PatientOption,
  SessionOption,
} from "@/lib/options";

import { PaymentFormDialog } from "../../paiements/payment-form-dialog";
import { InvoiceFormDialog, type InvoiceFormData } from "../invoice-form-dialog";

/** Barre d'actions de la page facture (masquée à l'impression). */
export function InvoiceActions({
  invoice,
  patients,
  invoiceOptions,
  sessions,
  defaultAmount,
  defaultDate,
  canManage,
}: {
  invoice: InvoiceFormData & { remainingAmount: number };
  patients: PatientOption[];
  invoiceOptions: InvoiceOption[];
  sessions: SessionOption[];
  defaultAmount: string;
  defaultDate: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Facture supprimée.");
        router.push("/factures");
      }
    });
  }

  if (!canManage) return null;

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {invoice.remainingAmount > 0.005 ? (
        <PaymentFormDialog
          patients={patients}
          sessions={sessions}
          invoices={invoiceOptions}
          defaultInvoiceId={invoice.id}
          defaultDate={defaultDate}
          defaultAmount={defaultAmount}
          trigger={
            <Button>
              <Wallet />
              Enregistrer un paiement
            </Button>
          }
        />
      ) : null}

      <InvoiceFormDialog
        patients={patients}
        invoice={invoice}
        trigger={
          <Button variant="outline">
            <Pencil />
            Modifier
          </Button>
        }
      />

      <ConfirmDialog
        title="Supprimer la facture"
        description="La facture sera retirée de la liste. Les paiements associés sont conservés."
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

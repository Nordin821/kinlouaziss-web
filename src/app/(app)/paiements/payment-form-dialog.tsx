"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createPayment, updatePayment } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  InvoiceOption,
  PatientOption,
  SessionOption,
} from "@/lib/options";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/validations/payment";

export type PaymentFormData = {
  id: number;
  patientId: number;
  sessionId: number | null;
  invoiceId: number | null;
  date: string;
  amount: number;
  paidAmount: number;
  method: string;
  transactionNumber: string;
  notes: string;
};

export function PaymentFormDialog({
  patients,
  sessions,
  invoices,
  payment,
  defaultDate,
  defaultAmount,
  defaultInvoiceId,
  trigger,
}: {
  patients: PatientOption[];
  sessions: SessionOption[];
  invoices: InvoiceOption[];
  payment?: PaymentFormData;
  defaultDate?: string;
  defaultAmount?: string;
  defaultInvoiceId?: number;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const paidRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(payment?.id);
  const action = isEdit ? updatePayment.bind(null, payment!.id) : createPayment;

  const preselectedInvoice = defaultInvoiceId
    ? invoices.find((invoice) => invoice.id === defaultInvoiceId)
    : undefined;

  const initialPatientId = payment
    ? String(payment.patientId)
    : preselectedInvoice
      ? String(preselectedInvoice.patientId)
      : "";

  const initialInvoiceId = payment?.invoiceId
    ? String(payment.invoiceId)
    : defaultInvoiceId
      ? String(defaultInvoiceId)
      : "";

  const initialAmount = payment
    ? String(payment.amount)
    : preselectedInvoice
      ? String(preselectedInvoice.remaining)
      : (defaultAmount ?? "");

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await action(formData);
      if (result && "error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(isEdit ? "Paiement mis à jour." : "Paiement enregistré.");
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  /** Propage le montant dû vers le montant réglé s'il est encore vide. */
  function syncPaidAmount() {
    if (!paidRef.current || paidRef.current.value) return;
    paidRef.current.value = amountRef.current?.value ?? "";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le paiement" : "Nouveau paiement"}
          </DialogTitle>
          <DialogDescription>
            Encaissez un règlement et rattachez-le éventuellement à une facture.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Patient"
              htmlFor="patientId"
              required
              className="sm:col-span-2"
            >
              <NativeSelect
                id="patientId"
                name="patientId"
                defaultValue={initialPatientId}
                required
              >
                <option value="">— Sélectionner un patient —</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.fileNumber})
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Date du paiement" htmlFor="date" required>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={payment?.date ?? defaultDate ?? ""}
                required
              />
            </Field>

            <Field label="Moyen de paiement" htmlFor="method">
              <NativeSelect
                id="method"
                name="method"
                defaultValue={payment?.method ?? "cash"}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Montant dû" htmlFor="amount" required hint="En dirhams.">
              <Input
                ref={amountRef}
                id="amount"
                name="amount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={initialAmount}
                onBlur={syncPaidAmount}
                required
              />
            </Field>

            <Field
              label="Montant réglé"
              htmlFor="paidAmount"
              hint="Laisser vide si la totalité est réglée."
            >
              <Input
                ref={paidRef}
                id="paidAmount"
                name="paidAmount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={payment?.paidAmount ?? ""}
              />
            </Field>

            <Field label="Facture associée" htmlFor="invoiceId">
              <NativeSelect
                id="invoiceId"
                name="invoiceId"
                defaultValue={initialInvoiceId}
              >
                <option value="">— Aucune —</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Séance associée" htmlFor="sessionId">
              <NativeSelect
                id="sessionId"
                name="sessionId"
                defaultValue={payment?.sessionId ? String(payment.sessionId) : ""}
              >
                <option value="">— Aucune —</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              label="N° de transaction / chèque"
              htmlFor="transactionNumber"
              className="sm:col-span-2"
            >
              <Input
                id="transactionNumber"
                name="transactionNumber"
                defaultValue={payment?.transactionNumber ?? ""}
              />
            </Field>

            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={payment?.notes ?? ""}
              />
            </Field>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

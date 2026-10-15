"use client";

import { createQuote, updateQuote } from "@/app/actions/quotes";
import {
  DocumentFormDialog,
  type DocumentFormValues,
} from "@/components/document-form-dialog";
import type { LineItemInput } from "@/lib/documents";
import type { PatientOption } from "@/lib/options";
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
} from "@/lib/validations/quote";

export type QuoteItemRow = LineItemInput;

export type QuoteFormData = {
  id: number;
  patientId: number;
  issueDate: string;
  validUntil: string;
  discount: number;
  vatRate: number;
  notes: string;
  status: string;
  items: QuoteItemRow[];
};

const STATUS_OPTIONS = QUOTE_STATUSES.map((status) => ({
  value: status,
  label: QUOTE_STATUS_LABELS[status],
}));

/** Formulaire de devis, appuyé sur l'éditeur de document partagé. */
export function QuoteFormDialog({
  patients,
  quote,
  defaultDate,
  defaultUnitPrice,
  trigger,
}: {
  patients: PatientOption[];
  quote?: QuoteFormData;
  defaultDate?: string;
  defaultUnitPrice?: string;
  trigger: React.ReactNode;
}) {
  const isEdit = Boolean(quote?.id);
  const action = isEdit ? updateQuote.bind(null, quote!.id) : createQuote;

  const values: DocumentFormValues | undefined = quote
    ? {
        id: quote.id,
        patientId: quote.patientId,
        issueDate: quote.issueDate,
        secondDate: quote.validUntil,
        discount: quote.discount,
        vatRate: quote.vatRate,
        notes: quote.notes,
        status: quote.status,
        items: quote.items,
      }
    : undefined;

  return (
    <DocumentFormDialog
      kind="quote"
      patients={patients}
      document={values}
      secondDateName="validUntil"
      statusOptions={STATUS_OPTIONS}
      defaultDate={defaultDate}
      defaultUnitPrice={defaultUnitPrice}
      action={action}
      trigger={trigger}
    />
  );
}

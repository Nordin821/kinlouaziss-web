"use client";

import { createInvoice, updateInvoice } from "@/app/actions/invoices";
import {
  DocumentFormDialog,
  type DocumentFormValues,
} from "@/components/document-form-dialog";
import type { LineItemInput } from "@/lib/documents";
import type { PatientOption } from "@/lib/options";

export type InvoiceItemRow = LineItemInput;

export type InvoiceFormData = {
  id: number;
  patientId: number;
  issueDate: string;
  dueDate: string;
  discount: number;
  vatRate: number;
  notes: string;
  items: InvoiceItemRow[];
};

/** Formulaire de facture, appuyé sur l'éditeur de document partagé. */
export function InvoiceFormDialog({
  patients,
  invoice,
  defaultDate,
  defaultUnitPrice,
  trigger,
}: {
  patients: PatientOption[];
  invoice?: InvoiceFormData;
  defaultDate?: string;
  defaultUnitPrice?: string;
  trigger: React.ReactNode;
}) {
  const isEdit = Boolean(invoice?.id);
  const action = isEdit
    ? updateInvoice.bind(null, invoice!.id)
    : createInvoice;

  const values: DocumentFormValues | undefined = invoice
    ? {
        id: invoice.id,
        patientId: invoice.patientId,
        issueDate: invoice.issueDate,
        secondDate: invoice.dueDate,
        discount: invoice.discount,
        vatRate: invoice.vatRate,
        notes: invoice.notes,
        items: invoice.items,
      }
    : undefined;

  return (
    <DocumentFormDialog
      kind="invoice"
      patients={patients}
      document={values}
      secondDateName="dueDate"
      defaultDate={defaultDate}
      defaultUnitPrice={defaultUnitPrice}
      action={action}
      trigger={trigger}
    />
  );
}

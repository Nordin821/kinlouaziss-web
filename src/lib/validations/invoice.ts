import { z } from "zod";

import { optionalNumber } from "@/lib/validations/common";

export const INVOICE_STATUSES = ["unpaid", "partial", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoiceFormSchema = z.object({
  patientId: z.coerce.number().int().positive("Sélectionnez un patient."),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date d'émission invalide."),
  dueDate: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Échéance invalide.")
    .optional(),
  discount: optionalNumber(10_000_000),
  vatRate: optionalNumber(100),
  notes: z.string().trim().max(2000).optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

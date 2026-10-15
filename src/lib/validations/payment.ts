import { z } from "zod";

import { requiredNumber } from "@/lib/validations/common";

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "cheque",
  "transfer",
  "insurance",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  card: "Carte bancaire",
  cheque: "Chèque",
  transfer: "Virement",
  insurance: "Mutuelle / assurance",
};

export const paymentFormSchema = z.object({
  patientId: z.coerce.number().int().positive("Sélectionnez un patient."),
  /** Chaîne vide = aucun rattachement. */
  sessionId: z.string().optional(),
  invoiceId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  amount: requiredNumber(1_000_000),
  paidAmount: requiredNumber(1_000_000),
  method: z.enum(PAYMENT_METHODS),
  transactionNumber: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

/** Statut de règlement déduit d'un montant dû et d'un montant réglé. */
export function settlementStatus(
  amount: number,
  paidAmount: number,
): "paid" | "partial" | "unpaid" {
  if (paidAmount >= amount - 0.005) return "paid";
  if (paidAmount > 0) return "partial";
  return "unpaid";
}

export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Réglé",
  partial: "Partiel",
  unpaid: "Impayé",
};

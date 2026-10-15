import { z } from "zod";

import { optionalNumber } from "@/lib/validations/common";

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
};

export const quoteFormSchema = z.object({
  patientId: z.coerce.number().int().positive("Sélectionnez un patient."),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date d'émission invalide."),
  validUntil: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Validité invalide.")
    .optional(),
  discount: optionalNumber(10_000_000),
  vatRate: optionalNumber(100),
  status: z.enum(QUOTE_STATUSES),
  notes: z.string().trim().max(2000).optional(),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

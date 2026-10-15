import { z } from "zod";

export const THERAPIST_STATUSES = ["active", "inactive"] as const;
export type TherapistStatus = (typeof THERAPIST_STATUSES)[number];

export const THERAPIST_STATUS_LABELS: Record<TherapistStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
};

export const therapistFormSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est requis.").max(80),
  lastName: z.string().trim().min(2, "Le nom est requis.").max(80),
  phone: z.string().trim().max(40).optional(),
  email: z
    .union([z.literal(""), z.string().trim().email("Adresse e-mail invalide.")])
    .optional(),
  specialty: z.string().trim().max(120).optional(),
  professionalNumber: z.string().trim().max(80).optional(),
  status: z.enum(THERAPIST_STATUSES),
  notes: z.string().trim().max(1000).optional(),
});

export type TherapistFormValues = z.infer<typeof therapistFormSchema>;

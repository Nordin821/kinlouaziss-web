import { z } from "zod";

export const GENDERS = ["male", "female", "unspecified"] as const;
export const PATIENT_STATUSES = ["active", "inactive", "archived"] as const;

export const patientFormSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(80),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(80),
  gender: z.enum(GENDERS).default("unspecified"),
  birthDate: z.string().trim().optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.email("Adresse e-mail invalide."), z.literal("")]).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  occupation: z.string().trim().max(120).optional(),
  referringDoctor: z.string().trim().max(120).optional(),
  referringDoctorPhone: z.string().trim().max(30).optional(),
  status: z.enum(PATIENT_STATUSES).default("active"),
  notes: z.string().trim().max(2000).optional(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
  male: "Masculin",
  female: "Féminin",
  unspecified: "Non précisé",
};

export const PATIENT_STATUS_LABELS: Record<
  (typeof PATIENT_STATUSES)[number],
  string
> = {
  active: "Actif",
  inactive: "Inactif",
  archived: "Archivé",
};

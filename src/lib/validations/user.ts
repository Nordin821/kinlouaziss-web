import { z } from "zod";

import { ROLES } from "@/lib/rbac";

/** Les trois rôles, sous forme de tuple exploitable par `z.enum`. */
const roleCodes = [ROLES.admin, ROLES.therapist, ROLES.receptionist] as const;

/** Statut d'activation d'un compte. */
export const USER_STATUSES = ["active", "inactive"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const userCreateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Le nom complet est requis.")
    .max(120, "Nom trop long."),
  email: z.email("Adresse e-mail invalide."),
  phone: z.string().trim().max(30, "Numéro trop long.").optional(),
  roleCode: z.enum(roleCodes),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(72, "Mot de passe trop long."),
});

export type UserCreateValues = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Le nom complet est requis.")
    .max(120, "Nom trop long."),
  phone: z.string().trim().max(30, "Numéro trop long.").optional(),
  roleCode: z.enum(roleCodes),
  status: z.enum(USER_STATUSES),
  /** Nouveau mot de passe, facultatif lors d'une modification. */
  password: z
    .union([
      z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
      z.literal(""),
    ])
    .optional(),
});

export type UserUpdateValues = z.infer<typeof userUpdateSchema>;

/** Libellé lisible d'un statut de compte. */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
};

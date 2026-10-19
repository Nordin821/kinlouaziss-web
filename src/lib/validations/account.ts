import { z } from "zod";

/** Modification du profil de l'utilisateur connecté. */
export const accountProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Le nom complet est requis.")
    .max(120, "Nom trop long."),
  phone: z.string().trim().max(30, "Numéro trop long.").optional(),
});

export type AccountProfileValues = z.infer<typeof accountProfileSchema>;

/**
 * Changement de mot de passe par l'utilisateur lui-même.
 *
 * Le mot de passe actuel est exigé : c'est ce qui distingue cette action d'une
 * réinitialisation par un administrateur, laquelle n'a pas accès à l'ancien
 * mot de passe.
 */
export const accountPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel."),
    newPassword: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
      .max(72, "Mot de passe trop long."),
    confirmPassword: z.string().min(1, "Confirmez le nouveau mot de passe."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Le nouveau mot de passe doit être différent de l'actuel.",
    path: ["newPassword"],
  });

export type AccountPasswordValues = z.infer<typeof accountPasswordSchema>;

/**
 * Choix d'un nouveau mot de passe **après réinitialisation par un
 * administrateur**.
 *
 * Le mot de passe provisoire vient d'être saisi pour se connecter : il n'a pas
 * à être ressaisi, la session en cours prouve déjà qu'il est connu.
 */
export const passwordChoiceSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
      .max(72, "Mot de passe trop long."),
    confirmPassword: z.string().min(1, "Confirmez le nouveau mot de passe."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type PasswordChoiceValues = z.infer<typeof passwordChoiceSchema>;

import { z } from "zod";

import { optionalInt } from "@/lib/validations/common";

/**
 * Types de séance et statuts partagés par l'agenda et les séances.
 * Alignés sur l'application desktop.
 */

export const SESSION_TYPES = [
  "kinesitherapie",
  "reeducation",
  "massage",
  "electrotherapy",
  "thermotherapy",
  "autre",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_TYPE_LABELS: Record<string, string> = {
  kinesitherapie: "Kinésithérapie",
  reeducation: "Rééducation fonctionnelle",
  massage: "Massage thérapeutique",
  electrotherapy: "Électrothérapie",
  thermotherapy: "Thermothérapie",
  autre: "Autre",
};

export const SESSION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

/** Libellé d'un type de séance, avec repli sur la valeur brute. */
export function sessionTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return SESSION_TYPE_LABELS[value] ?? value;
}

export const sessionFormSchema = z.object({
  patientId: z.coerce.number().int().positive("Sélectionnez un patient."),
  /** Thérapeute facultatif : « 0 » ou vide = non assigné. */
  therapistId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  /** Heure « hh:mm » facultative. */
  startTime: z
    .string()
    .trim()
    .regex(/^(\d{1,2}:\d{2})?$/, "Heure invalide.")
    .optional(),
  duration: optionalInt(600),
  sessionType: z.enum(SESSION_TYPES),
  status: z.enum(SESSION_STATUSES),
  reason: z.string().trim().max(500).optional(),
  treatmentDone: z.string().trim().max(2000).optional(),
  manualTherapy: z.string().trim().max(1000).optional(),
  electrotherapy: z.string().trim().max(1000).optional(),
  thermotherapy: z.string().trim().max(1000).optional(),
  homeExercises: z.string().trim().max(2000).optional(),
  observations: z.string().trim().max(2000).optional(),
  painEvolution: z.string().trim().max(500).optional(),
  mobilityEvolution: z.string().trim().max(500).optional(),
  strengthEvolution: z.string().trim().max(500).optional(),
  functionalEvolution: z.string().trim().max(500).optional(),
  progress: z.string().trim().max(1000).optional(),
  difficulties: z.string().trim().max(1000).optional(),
  recommendations: z.string().trim().max(1000).optional(),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

/** Ligne d'exercice associée à une séance. */
export type SessionExerciseInput = {
  exerciseId: number;
  repetitions: number | null;
  sets: number | null;
};

/** Extrait les lignes d'exercices d'un formulaire (listes parallèles). */
export function readSessionExercises(formData: FormData): SessionExerciseInput[] {
  const ids = formData.getAll("exerciseId").map((value) => String(value));
  const repetitions = formData.getAll("exerciseReps").map((value) => String(value));
  const sets = formData.getAll("exerciseSets").map((value) => String(value));

  const result: SessionExerciseInput[] = [];
  ids.forEach((rawId, index) => {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return;
    const reps = Number(repetitions[index]);
    const setCount = Number(sets[index]);
    result.push({
      exerciseId: id,
      repetitions: Number.isFinite(reps) && reps > 0 ? reps : null,
      sets: Number.isFinite(setCount) && setCount > 0 ? setCount : null,
    });
  });

  return result;
}

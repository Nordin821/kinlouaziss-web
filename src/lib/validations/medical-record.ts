import { z } from "zod";

import { optionalInt } from "@/lib/validations/common";

/** Dossier médical principal (un par patient). */
export const medicalRecordSchema = z.object({
  chiefComplaint: z.string().trim().max(2000).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
  finalEvaluation: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type MedicalRecordValues = z.infer<typeof medicalRecordSchema>;

/** Antécédents médicaux (un par patient). */
export const medicalHistorySchema = z.object({
  diseaseHistory: z.string().trim().max(2000).optional(),
  pastMedicalHistory: z.string().trim().max(2000).optional(),
  surgicalHistory: z.string().trim().max(2000).optional(),
  injuries: z.string().trim().max(2000).optional(),
  chronicDiseases: z.string().trim().max(2000).optional(),
  medications: z.string().trim().max(2000).optional(),
  allergies: z.string().trim().max(2000).optional(),
  observations: z.string().trim().max(2000).optional(),
});
export type MedicalHistoryValues = z.infer<typeof medicalHistorySchema>;

/** Objectifs de traitement (un par patient). */
export const treatmentGoalSchema = z.object({
  mainGoal: z.string().trim().max(1000).optional(),
  shortTermGoals: z.string().trim().max(2000).optional(),
  longTermGoals: z.string().trim().max(2000).optional(),
});
export type TreatmentGoalValues = z.infer<typeof treatmentGoalSchema>;

/** Bilan / évaluation clinique (plusieurs par patient). */
export const assessmentSchema = z.object({
  assessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  painLevel: optionalInt(10),
  painLocation: z.string().trim().max(300).optional(),
  painScale: z.string().trim().max(120).optional(),
  rangeOfMotion: z.string().trim().max(1000).optional(),
  muscleStrength: z.string().trim().max(1000).optional(),
  balance: z.string().trim().max(500).optional(),
  gait: z.string().trim().max(500).optional(),
  mobility: z.string().trim().max(500).optional(),
  motorFunction: z.string().trim().max(1000).optional(),
  posture: z.string().trim().max(500).optional(),
  observations: z.string().trim().max(2000).optional(),
});
export type AssessmentValues = z.infer<typeof assessmentSchema>;

/** Plan de traitement (plusieurs par patient). */
export const PLAN_STATUSES = ["active", "completed", "cancelled"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  active: "En cours",
  completed: "Terminé",
  cancelled: "Abandonné",
};

export const treatmentPlanSchema = z.object({
  treatmentType: z.string().trim().max(300).optional(),
  plannedSessions: optionalInt(500),
  sessionDuration: optionalInt(600),
  frequency: z.string().trim().max(200).optional(),
  techniques: z.string().trim().max(2000).optional(),
  exercises: z.string().trim().max(2000).optional(),
  goals: z.string().trim().max(2000).optional(),
  observations: z.string().trim().max(2000).optional(),
  status: z.enum(PLAN_STATUSES),
});
export type TreatmentPlanValues = z.infer<typeof treatmentPlanSchema>;

import { z } from "zod";

import { optionalInt } from "@/lib/validations/common";

export const DIFFICULTY_LEVELS = ["facile", "moyen", "difficile"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(2, "Le nom est requis.").max(150),
  description: z.string().trim().max(1000).optional(),
  targetArea: z.string().trim().max(120).optional(),
  goal: z.string().trim().max(300).optional(),
  repetitions: optionalInt(1000),
  sets: optionalInt(100),
  duration: optionalInt(600),
  difficulty: z.enum(DIFFICULTY_LEVELS),
  instructions: z.string().trim().max(3000).optional(),
  precautions: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

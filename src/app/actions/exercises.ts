"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  exerciseFormSchema,
  type ExerciseFormValues,
} from "@/lib/validations/exercise";

export type ExerciseActionState = { ok: true } | { error: string } | undefined;

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function extractValues(formData: FormData): ExerciseFormValues {
  const raw = Object.fromEntries(formData.entries());
  return exerciseFormSchema.parse({
    name: raw.name ?? "",
    description: raw.description ?? "",
    targetArea: raw.targetArea ?? "",
    goal: raw.goal ?? "",
    repetitions: raw.repetitions ?? "",
    sets: raw.sets ?? "",
    duration: raw.duration ?? "",
    difficulty: raw.difficulty || "moyen",
    instructions: raw.instructions ?? "",
    precautions: raw.precautions ?? "",
    notes: raw.notes ?? "",
  });
}

async function requireManage() {
  const user = await requireUser();
  if (!userHasPermission(user, "exercises.manage")) {
    return { user: null, error: "Action non autorisée." } as const;
  }
  return { user, error: null } as const;
}

export async function createExercise(
  formData: FormData,
): Promise<ExerciseActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: ExerciseFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  try {
    const created = await prisma.exercise.create({
      data: {
        name: values.name,
        description: emptyToNull(values.description),
        targetArea: emptyToNull(values.targetArea),
        goal: emptyToNull(values.goal),
        repetitions: values.repetitions ?? null,
        sets: values.sets ?? null,
        duration: values.duration ?? null,
        difficulty: values.difficulty,
        instructions: emptyToNull(values.instructions),
        precautions: emptyToNull(values.precautions),
        notes: emptyToNull(values.notes),
      },
      select: { id: true },
    });

    await logAudit(user, "exercise.create", "exercise", created.id, values.name);

    revalidatePath(ROUTES.exercises);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer l'exercice." };
  }
}

export async function updateExercise(
  exerciseId: number,
  formData: FormData,
): Promise<ExerciseActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: ExerciseFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  try {
    await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        name: values.name,
        description: emptyToNull(values.description),
        targetArea: emptyToNull(values.targetArea),
        goal: emptyToNull(values.goal),
        repetitions: values.repetitions ?? null,
        sets: values.sets ?? null,
        duration: values.duration ?? null,
        difficulty: values.difficulty,
        instructions: emptyToNull(values.instructions),
        precautions: emptyToNull(values.precautions),
        notes: emptyToNull(values.notes),
      },
    });

    await logAudit(user, "exercise.update", "exercise", exerciseId, values.name);

    revalidatePath(ROUTES.exercises);
    return { ok: true };
  } catch {
    return { error: "Impossible de mettre à jour l'exercice." };
  }
}

/** Suppression logique d'un exercice de la bibliothèque. */
export async function deleteExercise(
  exerciseId: number,
): Promise<ExerciseActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    await prisma.exercise.update({
      where: { id: exerciseId },
      data: { deletedAt: new Date() },
    });

    await logAudit(user, "exercise.delete", "exercise", exerciseId);

    revalidatePath(ROUTES.exercises);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer l'exercice." };
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { combineDateTime } from "@/lib/validations/appointment";
import {
  emptyToNull,
  toIdOrNull,
} from "@/lib/validations/common";
import {
  readSessionExercises,
  SESSION_STATUSES,
  sessionFormSchema,
  type SessionExerciseInput,
  type SessionFormValues,
} from "@/lib/validations/session";

export type SessionActionState = { ok: true } | { error: string } | undefined;

function extractValues(formData: FormData): SessionFormValues {
  const raw = Object.fromEntries(formData.entries());
  return sessionFormSchema.parse({
    patientId: raw.patientId,
    therapistId: raw.therapistId ?? "",
    date: raw.date ?? "",
    startTime: raw.startTime ?? "",
    duration: raw.duration ?? "",
    sessionType: raw.sessionType || "kinesitherapie",
    status: raw.status || "completed",
    reason: raw.reason ?? "",
    treatmentDone: raw.treatmentDone ?? "",
    manualTherapy: raw.manualTherapy ?? "",
    electrotherapy: raw.electrotherapy ?? "",
    thermotherapy: raw.thermotherapy ?? "",
    homeExercises: raw.homeExercises ?? "",
    observations: raw.observations ?? "",
    painEvolution: raw.painEvolution ?? "",
    mobilityEvolution: raw.mobilityEvolution ?? "",
    strengthEvolution: raw.strengthEvolution ?? "",
    functionalEvolution: raw.functionalEvolution ?? "",
    progress: raw.progress ?? "",
    difficulties: raw.difficulties ?? "",
    recommendations: raw.recommendations ?? "",
  });
}

function progressData(values: SessionFormValues) {
  return {
    painEvolution: emptyToNull(values.painEvolution),
    mobilityEvolution: emptyToNull(values.mobilityEvolution),
    strengthEvolution: emptyToNull(values.strengthEvolution),
    functionalEvolution: emptyToNull(values.functionalEvolution),
    progress: emptyToNull(values.progress),
    difficulties: emptyToNull(values.difficulties),
    recommendations: emptyToNull(values.recommendations),
  };
}

/** Remplace les exercices associés à une séance. */
async function persistExercises(
  sessionId: number,
  items: SessionExerciseInput[],
): Promise<void> {
  await prisma.sessionExercise.deleteMany({ where: { sessionId } });
  if (items.length === 0) return;

  await prisma.sessionExercise.createMany({
    data: items.map((item) => ({
      sessionId,
      exerciseId: item.exerciseId,
      repetitions: item.repetitions,
      sets: item.sets,
    })),
  });
}

/** Crée ou met à jour la ligne de progression d'une séance. */
async function persistProgress(
  sessionId: number,
  patientId: number,
  values: SessionFormValues,
): Promise<void> {
  const data = progressData(values);
  const hasContent = Object.values(data).some((value) => value !== null);
  if (!hasContent) return;

  const existing = await prisma.sessionProgress.findFirst({
    where: { sessionId },
    select: { id: true },
  });

  if (existing) {
    await prisma.sessionProgress.update({ where: { id: existing.id }, data });
  } else {
    await prisma.sessionProgress.create({
      data: { sessionId, patientId, ...data },
    });
  }
}

async function requireManage() {
  const user = await requireUser();
  if (!userHasPermission(user, "sessions.manage")) {
    return { user: null, error: "Action non autorisée." } as const;
  }
  return { user, error: null } as const;
}

export async function createSession(
  formData: FormData,
): Promise<SessionActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: SessionFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const sessionDate = combineDateTime(values.date, "00:00");
  if (!sessionDate) return { error: "Date invalide." };

  try {
    const created = await prisma.session.create({
      data: {
        patientId: values.patientId,
        therapistId: toIdOrNull(values.therapistId),
        sessionDate,
        startTime: emptyToNull(values.startTime),
        duration: values.duration ?? null,
        sessionType: values.sessionType,
        status: values.status,
        reason: emptyToNull(values.reason),
        treatmentDone: emptyToNull(values.treatmentDone),
        manualTherapy: emptyToNull(values.manualTherapy),
        electrotherapy: emptyToNull(values.electrotherapy),
        thermotherapy: emptyToNull(values.thermotherapy),
        homeExercises: emptyToNull(values.homeExercises),
        observations: emptyToNull(values.observations),
      },
      select: { id: true },
    });

    await persistProgress(created.id, values.patientId, values);
    await persistExercises(created.id, readSessionExercises(formData));

    await logAudit(user, "session.create", "session", created.id, values.date);

    revalidatePath(ROUTES.sessions);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${values.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer la séance." };
  }
}

export async function updateSession(
  sessionId: number,
  formData: FormData,
): Promise<SessionActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: SessionFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const sessionDate = combineDateTime(values.date, "00:00");
  if (!sessionDate) return { error: "Date invalide." };

  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        patientId: values.patientId,
        therapistId: toIdOrNull(values.therapistId),
        sessionDate,
        startTime: emptyToNull(values.startTime),
        duration: values.duration ?? null,
        sessionType: values.sessionType,
        status: values.status,
        reason: emptyToNull(values.reason),
        treatmentDone: emptyToNull(values.treatmentDone),
        manualTherapy: emptyToNull(values.manualTherapy),
        electrotherapy: emptyToNull(values.electrotherapy),
        thermotherapy: emptyToNull(values.thermotherapy),
        homeExercises: emptyToNull(values.homeExercises),
        observations: emptyToNull(values.observations),
      },
    });

    await persistProgress(sessionId, values.patientId, values);
    await persistExercises(sessionId, readSessionExercises(formData));

    await logAudit(user, "session.update", "session", sessionId, values.date);

    revalidatePath(ROUTES.sessions);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${values.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de mettre à jour la séance." };
  }
}

export async function setSessionStatus(
  sessionId: number,
  status: string,
): Promise<SessionActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  if (!(SESSION_STATUSES as readonly string[]).includes(status)) {
    return { error: "Statut invalide." };
  }

  try {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { status },
      select: { patientId: true },
    });

    await logAudit(user, "session.status", "session", sessionId, status);

    revalidatePath(ROUTES.sessions);
    revalidatePath(`${ROUTES.patients}/${session.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de modifier le statut." };
  }
}

/** Suppression logique d'une séance. */
export async function deleteSession(
  sessionId: number,
): Promise<SessionActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { deletedAt: new Date() },
      select: { patientId: true },
    });

    await logAudit(user, "session.delete", "session", sessionId);

    revalidatePath(ROUTES.sessions);
    revalidatePath(`${ROUTES.patients}/${session.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer la séance." };
  }
}

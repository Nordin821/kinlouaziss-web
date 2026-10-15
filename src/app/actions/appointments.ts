"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  APPOINTMENT_STATUSES,
  appointmentFormSchema,
  combineDateTime,
  toTimeInputValue,
  type AppointmentFormValues,
} from "@/lib/validations/appointment";

export type AppointmentActionState =
  | { ok: true }
  | { error: string }
  | undefined;

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseTherapistId(value: string | undefined): number | null {
  if (!value || value === "0") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function extractValues(formData: FormData): AppointmentFormValues {
  const raw = Object.fromEntries(formData.entries());
  return appointmentFormSchema.parse({
    patientId: raw.patientId,
    therapistId: raw.therapistId ?? "",
    date: raw.date ?? "",
    startTime: raw.startTime ?? "",
    duration: raw.duration ?? "45",
    sessionType: raw.sessionType || "kinesitherapie",
    status: raw.status || "planned",
    notes: raw.notes ?? "",
  });
}

/** Vérifie que l'utilisateur peut planifier des rendez-vous. */
async function requireManage() {
  const user = await requireUser();
  if (!userHasPermission(user, "appointments.manage")) {
    return { user: null, error: "Action non autorisée." } as const;
  }
  return { user, error: null } as const;
}

/** Détecte un chevauchement de créneau pour un même thérapeute. */
async function hasConflict(
  therapistId: number | null,
  startsAt: Date,
  endsAt: Date,
  excludeId?: number,
): Promise<boolean> {
  if (!therapistId) return false;

  const conflict = await prisma.appointment.findFirst({
    where: {
      therapistId,
      deletedAt: null,
      status: { notIn: ["cancelled"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  return Boolean(conflict);
}

export async function createAppointment(
  formData: FormData,
): Promise<AppointmentActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: AppointmentFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const startsAt = combineDateTime(values.date, values.startTime);
  if (!startsAt) return { error: "Date ou heure invalide." };
  const endsAt = new Date(startsAt.getTime() + values.duration * 60_000);
  const therapistId = parseTherapistId(values.therapistId);

  if (await hasConflict(therapistId, startsAt, endsAt)) {
    return { error: "Ce thérapeute a déjà un rendez-vous sur ce créneau." };
  }

  try {
    const created = await prisma.appointment.create({
      data: {
        patientId: values.patientId,
        therapistId,
        startsAt,
        endsAt,
        sessionType: values.sessionType,
        status: values.status,
        notes: emptyToNull(values.notes),
      },
      select: { id: true },
    });

    await logAudit(
      user,
      "appointment.create",
      "appointment",
      created.id,
      `${values.date} ${values.startTime}`,
    );

    revalidatePath(ROUTES.appointments);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${values.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer le rendez-vous." };
  }
}

export async function updateAppointment(
  appointmentId: number,
  formData: FormData,
): Promise<AppointmentActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: AppointmentFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const startsAt = combineDateTime(values.date, values.startTime);
  if (!startsAt) return { error: "Date ou heure invalide." };
  const endsAt = new Date(startsAt.getTime() + values.duration * 60_000);
  const therapistId = parseTherapistId(values.therapistId);

  if (await hasConflict(therapistId, startsAt, endsAt, appointmentId)) {
    return { error: "Ce thérapeute a déjà un rendez-vous sur ce créneau." };
  }

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        patientId: values.patientId,
        therapistId,
        startsAt,
        endsAt,
        sessionType: values.sessionType,
        status: values.status,
        notes: emptyToNull(values.notes),
      },
    });

    await logAudit(
      user,
      "appointment.update",
      "appointment",
      appointmentId,
      `${values.date} ${values.startTime}`,
    );

    revalidatePath(ROUTES.appointments);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${values.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de mettre à jour le rendez-vous." };
  }
}

/**
 * Change le statut d'un rendez-vous.
 * Le passage à « terminé » crée automatiquement la séance correspondante
 * (une seule fois), ce qui évite la double saisie agenda → séances.
 */
export async function setAppointmentStatus(
  appointmentId: number,
  status: string,
): Promise<AppointmentActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  if (!(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
    return { error: "Statut invalide." };
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientId: true,
      therapistId: true,
      startsAt: true,
      endsAt: true,
      sessionType: true,
    },
  });
  if (!appointment) return { error: "Rendez-vous introuvable." };

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    if (status === "completed") {
      const existing = await prisma.session.findFirst({
        where: { appointmentId },
        select: { id: true },
      });

      if (!existing) {
        await prisma.session.create({
          data: {
            patientId: appointment.patientId,
            therapistId: appointment.therapistId,
            appointmentId,
            sessionDate: appointment.startsAt,
            startTime: toTimeInputValue(appointment.startsAt),
            endTime: toTimeInputValue(appointment.endsAt),
            duration: Math.round(
              (appointment.endsAt.getTime() - appointment.startsAt.getTime()) /
                60_000,
            ),
            sessionType: appointment.sessionType,
            status: "completed",
          },
        });
        revalidatePath(ROUTES.sessions);
      }
    }

    await logAudit(
      user,
      "appointment.status",
      "appointment",
      appointmentId,
      status,
    );

    revalidatePath(ROUTES.appointments);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${appointment.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de modifier le statut." };
  }
}

/** Suppression logique d'un rendez-vous. */
export async function deleteAppointment(
  appointmentId: number,
): Promise<AppointmentActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { deletedAt: new Date(), status: "cancelled" },
      select: { patientId: true },
    });

    await logAudit(user, "appointment.delete", "appointment", appointmentId);

    revalidatePath(ROUTES.appointments);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${appointment.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer le rendez-vous." };
  }
}

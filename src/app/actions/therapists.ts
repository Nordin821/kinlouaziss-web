"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { emptyToNull } from "@/lib/validations/common";
import {
  THERAPIST_STATUSES,
  therapistFormSchema,
  type TherapistFormValues,
} from "@/lib/validations/therapist";

export type TherapistActionState = { ok: true } | { error: string } | undefined;

function extractValues(formData: FormData): TherapistFormValues {
  const raw = Object.fromEntries(formData.entries());
  return therapistFormSchema.parse({
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    specialty: raw.specialty ?? "",
    professionalNumber: raw.professionalNumber ?? "",
    status: raw.status || "active",
    notes: raw.notes ?? "",
  });
}

async function requireManage() {
  const user = await requireUser();
  if (!userHasPermission(user, "settings.manage")) {
    return { user: null, error: "Action non autorisée." } as const;
  }
  return { user, error: null } as const;
}

function revalidateTherapists(): void {
  revalidatePath(ROUTES.settings);
  revalidatePath(ROUTES.appointments);
  revalidatePath(ROUTES.sessions);
}

export async function createTherapist(
  formData: FormData,
): Promise<TherapistActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: TherapistFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  try {
    const created = await prisma.therapist.create({
      data: {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: emptyToNull(values.phone),
        email: emptyToNull(values.email),
        specialty: emptyToNull(values.specialty),
        professionalNumber: emptyToNull(values.professionalNumber),
        status: values.status,
        notes: emptyToNull(values.notes),
      },
      select: { id: true },
    });

    await logAudit(
      user,
      "therapist.create",
      "therapist",
      created.id,
      `${values.firstName} ${values.lastName}`,
    );

    revalidateTherapists();
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer le thérapeute." };
  }
}

export async function updateTherapist(
  therapistId: number,
  formData: FormData,
): Promise<TherapistActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: TherapistFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  try {
    await prisma.therapist.update({
      where: { id: therapistId },
      data: {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: emptyToNull(values.phone),
        email: emptyToNull(values.email),
        specialty: emptyToNull(values.specialty),
        professionalNumber: emptyToNull(values.professionalNumber),
        status: values.status,
        notes: emptyToNull(values.notes),
      },
    });

    await logAudit(user, "therapist.update", "therapist", therapistId);

    revalidateTherapists();
    return { ok: true };
  } catch {
    return { error: "Impossible de mettre à jour le thérapeute." };
  }
}

export async function setTherapistStatus(
  therapistId: number,
  status: string,
): Promise<TherapistActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  if (!(THERAPIST_STATUSES as readonly string[]).includes(status)) {
    return { error: "Statut invalide." };
  }

  try {
    await prisma.therapist.update({
      where: { id: therapistId },
      data: { status },
    });

    await logAudit(user, "therapist.status", "therapist", therapistId, status);
    revalidateTherapists();
    return { ok: true };
  } catch {
    return { error: "Impossible de modifier le statut." };
  }
}

/**
 * Suppression logique d'un thérapeute.
 *
 * Les rendez-vous et séances passés restent rattachés : la fiche est seulement
 * masquée des listes de sélection.
 */
export async function deleteTherapist(
  therapistId: number,
): Promise<TherapistActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    await prisma.therapist.update({
      where: { id: therapistId },
      data: { deletedAt: new Date(), status: "inactive" },
    });

    await logAudit(user, "therapist.delete", "therapist", therapistId);
    revalidateTherapists();
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer le thérapeute." };
  }
}

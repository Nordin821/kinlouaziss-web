"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/dal";
import {
  patientFormSchema,
  type PatientFormValues,
} from "@/lib/validations/patient";

export type PatientActionState =
  | { ok: true }
  | { error: string }
  | undefined;

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseBirthDate(value: string | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractFormData(formData: FormData): PatientFormValues {
  const raw = Object.fromEntries(formData.entries());
  return patientFormSchema.parse({
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    gender: raw.gender || "unspecified",
    birthDate: raw.birthDate ?? "",
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    address: raw.address ?? "",
    city: raw.city ?? "",
    occupation: raw.occupation ?? "",
    referringDoctor: raw.referringDoctor ?? "",
    referringDoctorPhone: raw.referringDoctorPhone ?? "",
    status: raw.status || "active",
    notes: raw.notes ?? "",
  });
}

/** Génère un numéro de dossier unique (« P-00001 »). */
async function nextFileNumber(): Promise<string> {
  const last = await prisma.patient.findFirst({
    where: { fileNumber: { startsWith: "P-" } },
    orderBy: { fileNumber: "desc" },
    select: { fileNumber: true },
  });
  const parsed = last ? Number.parseInt(last.fileNumber.replace(/\D/g, ""), 10) : 0;
  const next = (Number.isFinite(parsed) ? parsed : 0) + 1;
  return `P-${String(next).padStart(5, "0")}`;
}

async function logAudit(
  userId: string,
  userName: string,
  action: string,
  entityId: string,
  details?: string,
): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        userId,
        userName,
        action,
        entity: "patient",
        entityId,
        details,
      },
    })
    .catch(() => undefined);
}

export async function createPatient(
  formData: FormData,
): Promise<PatientActionState> {
  const user = await requireUser();

  let values: PatientFormValues;
  try {
    values = extractFormData(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  try {
    const fileNumber = await nextFileNumber();
    const patient = await prisma.patient.create({
      data: {
        fileNumber,
        firstName: values.firstName,
        lastName: values.lastName,
        gender: values.gender,
        birthDate: parseBirthDate(values.birthDate),
        phone: emptyToNull(values.phone),
        email: emptyToNull(values.email),
        address: emptyToNull(values.address),
        city: emptyToNull(values.city),
        occupation: emptyToNull(values.occupation),
        referringDoctor: emptyToNull(values.referringDoctor),
        referringDoctorPhone: emptyToNull(values.referringDoctorPhone),
        status: values.status,
        notes: emptyToNull(values.notes),
        medicalRecord: { create: {} },
        medicalHistory: { create: {} },
      },
      select: { id: true, fileNumber: true },
    });

    await logAudit(
      user.id,
      user.fullName,
      "patient.create",
      String(patient.id),
      `Dossier ${patient.fileNumber}`,
    );

    revalidatePath(ROUTES.patients);
    revalidatePath(ROUTES.dashboard);
    return { ok: true };
  } catch {
    return { error: "Impossible de créer le patient. Réessayez." };
  }
}

export async function updatePatient(
  patientId: number,
  formData: FormData,
): Promise<PatientActionState> {
  const user = await requireUser();

  let values: PatientFormValues;
  try {
    values = extractFormData(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  try {
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        firstName: values.firstName,
        lastName: values.lastName,
        gender: values.gender,
        birthDate: parseBirthDate(values.birthDate),
        phone: emptyToNull(values.phone),
        email: emptyToNull(values.email),
        address: emptyToNull(values.address),
        city: emptyToNull(values.city),
        occupation: emptyToNull(values.occupation),
        referringDoctor: emptyToNull(values.referringDoctor),
        referringDoctorPhone: emptyToNull(values.referringDoctorPhone),
        status: values.status,
        notes: emptyToNull(values.notes),
      },
    });

    await logAudit(user.id, user.fullName, "patient.update", String(patientId));

    revalidatePath(ROUTES.patients);
    revalidatePath(`${ROUTES.patients}/${patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de mettre à jour le patient." };
  }
}

/** Suppression logique (corbeille) d'un patient. */
export async function deletePatient(patientId: number): Promise<void> {
  const user = await requireUser();

  await prisma.patient.update({
    where: { id: patientId },
    data: { deletedAt: new Date(), status: "archived" },
  });

  await logAudit(user.id, user.fullName, "patient.delete", String(patientId));

  revalidatePath(ROUTES.patients);
  revalidatePath(ROUTES.dashboard);
}

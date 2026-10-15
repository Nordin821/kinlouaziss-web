"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { combineDateTime } from "@/lib/validations/appointment";
import { emptyToNull } from "@/lib/validations/common";
import {
  assessmentSchema,
  medicalHistorySchema,
  medicalRecordSchema,
  treatmentGoalSchema,
  treatmentPlanSchema,
  type AssessmentValues,
  type MedicalHistoryValues,
  type MedicalRecordValues,
  type TreatmentGoalValues,
  type TreatmentPlanValues,
} from "@/lib/validations/medical-record";

export type RecordActionState = { ok: true } | { error: string } | undefined;

async function requireManage() {
  const user = await requireUser();
  if (!userHasPermission(user, "records.manage")) {
    return { user: null, error: "Action non autorisée." } as const;
  }
  return { user, error: null } as const;
}

function revalidateRecord(patientId: number): void {
  revalidatePath(ROUTES.medicalRecords);
  revalidatePath(`${ROUTES.medicalRecords}/${patientId}`);
  revalidatePath(`${ROUTES.patients}/${patientId}`);
}

export async function saveMedicalRecord(
  patientId: number,
  formData: FormData,
): Promise<RecordActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: MedicalRecordValues;
  try {
    values = medicalRecordSchema.parse(Object.fromEntries(formData.entries()));
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const data = {
    chiefComplaint: emptyToNull(values.chiefComplaint),
    diagnosis: emptyToNull(values.diagnosis),
    finalEvaluation: emptyToNull(values.finalEvaluation),
    notes: emptyToNull(values.notes),
  };

  try {
    await prisma.medicalRecord.upsert({
      where: { patientId },
      update: data,
      create: { patientId, ...data },
    });

    await logAudit(user, "record.save", "patient", patientId);
    revalidateRecord(patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer le dossier médical." };
  }
}

export async function saveMedicalHistory(
  patientId: number,
  formData: FormData,
): Promise<RecordActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: MedicalHistoryValues;
  try {
    values = medicalHistorySchema.parse(Object.fromEntries(formData.entries()));
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const data = {
    diseaseHistory: emptyToNull(values.diseaseHistory),
    pastMedicalHistory: emptyToNull(values.pastMedicalHistory),
    surgicalHistory: emptyToNull(values.surgicalHistory),
    injuries: emptyToNull(values.injuries),
    chronicDiseases: emptyToNull(values.chronicDiseases),
    medications: emptyToNull(values.medications),
    allergies: emptyToNull(values.allergies),
    observations: emptyToNull(values.observations),
  };

  try {
    await prisma.medicalHistory.upsert({
      where: { patientId },
      update: data,
      create: { patientId, ...data },
    });

    await logAudit(user, "record.history", "patient", patientId);
    revalidateRecord(patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer les antécédents." };
  }
}

export async function saveTreatmentGoal(
  patientId: number,
  formData: FormData,
): Promise<RecordActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: TreatmentGoalValues;
  try {
    values = treatmentGoalSchema.parse(Object.fromEntries(formData.entries()));
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const data = {
    mainGoal: emptyToNull(values.mainGoal),
    shortTermGoals: emptyToNull(values.shortTermGoals),
    longTermGoals: emptyToNull(values.longTermGoals),
  };

  try {
    const existing = await prisma.treatmentGoal.findFirst({
      where: { patientId },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (existing) {
      await prisma.treatmentGoal.update({ where: { id: existing.id }, data });
    } else {
      await prisma.treatmentGoal.create({ data: { patientId, ...data } });
    }

    await logAudit(user, "record.goals", "patient", patientId);
    revalidateRecord(patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer les objectifs." };
  }
}

function assessmentData(values: AssessmentValues) {
  return {
    painLevel: values.painLevel ?? null,
    painLocation: emptyToNull(values.painLocation),
    painScale: emptyToNull(values.painScale),
    rangeOfMotion: emptyToNull(values.rangeOfMotion),
    muscleStrength: emptyToNull(values.muscleStrength),
    balance: emptyToNull(values.balance),
    gait: emptyToNull(values.gait),
    mobility: emptyToNull(values.mobility),
    motorFunction: emptyToNull(values.motorFunction),
    posture: emptyToNull(values.posture),
    observations: emptyToNull(values.observations),
  };
}

export async function saveAssessment(
  patientId: number,
  assessmentId: number | null,
  formData: FormData,
): Promise<RecordActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: AssessmentValues;
  try {
    values = assessmentSchema.parse(Object.fromEntries(formData.entries()));
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const assessedAt = combineDateTime(values.assessedAt, "00:00");
  if (!assessedAt) return { error: "Date d'évaluation invalide." };

  try {
    if (assessmentId) {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { assessedAt, ...assessmentData(values) },
      });
      await logAudit(user, "assessment.update", "assessment", assessmentId);
    } else {
      const created = await prisma.assessment.create({
        data: { patientId, assessedAt, ...assessmentData(values) },
        select: { id: true },
      });
      await logAudit(user, "assessment.create", "assessment", created.id);
    }

    revalidateRecord(patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer l'évaluation." };
  }
}

export async function deleteAssessment(
  patientId: number,
  assessmentId: number,
): Promise<RecordActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    await prisma.assessment.delete({ where: { id: assessmentId } });
    await logAudit(user, "assessment.delete", "assessment", assessmentId);
    revalidateRecord(patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer l'évaluation." };
  }
}

function planData(values: TreatmentPlanValues) {
  return {
    treatmentType: emptyToNull(values.treatmentType),
    plannedSessions: values.plannedSessions ?? null,
    sessionDuration: values.sessionDuration ?? null,
    frequency: emptyToNull(values.frequency),
    techniques: emptyToNull(values.techniques),
    exercises: emptyToNull(values.exercises),
    goals: emptyToNull(values.goals),
    observations: emptyToNull(values.observations),
    status: values.status,
  };
}

export async function saveTreatmentPlan(
  patientId: number,
  planId: number | null,
  formData: FormData,
): Promise<RecordActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: TreatmentPlanValues;
  try {
    values = treatmentPlanSchema.parse(Object.fromEntries(formData.entries()));
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  try {
    if (planId) {
      await prisma.treatmentPlan.update({
        where: { id: planId },
        data: planData(values),
      });
      await logAudit(user, "plan.update", "treatment_plan", planId);
    } else {
      const created = await prisma.treatmentPlan.create({
        data: { patientId, ...planData(values) },
        select: { id: true },
      });
      await logAudit(user, "plan.create", "treatment_plan", created.id);
    }

    revalidateRecord(patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer le plan de traitement." };
  }
}

export async function deleteTreatmentPlan(
  patientId: number,
  planId: number,
): Promise<RecordActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    await prisma.treatmentPlan.delete({ where: { id: planId } });
    await logAudit(user, "plan.delete", "treatment_plan", planId);
    revalidateRecord(patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer le plan de traitement." };
  }
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Stethoscope } from "lucide-react";

import { SectionForm } from "@/components/record-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES, patientPath } from "@/lib/constants";
import { requirePermission, userHasPermission } from "@/lib/dal";
import { calculateAge, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/validations/appointment";

import {
  saveMedicalHistory,
  saveMedicalRecord,
  saveTreatmentGoal,
} from "@/app/actions/medical-records";

import {
  AssessmentsSection,
  type AssessmentRow,
} from "./assessments-section";
import { PlansSection, type PlanRow } from "./plans-section";

export const metadata = { title: "Dossier médical" };

export default async function MedicalRecordPage({
  params,
}: PageProps<"/dossiers-medicaux/[patientId]">) {
  const user = await requirePermission("records.view");
  const canManage = userHasPermission(user, "records.manage");

  const { patientId } = await params;
  const id = Number(patientId);
  if (!Number.isInteger(id)) notFound();

  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    include: {
      medicalRecord: true,
      medicalHistory: true,
      treatmentGoals: { orderBy: { id: "asc" }, take: 1 },
      assessments: { orderBy: { assessedAt: "desc" } },
      treatmentPlans: { orderBy: { id: "desc" } },
    },
  });

  if (!patient) notFound();

  const record = patient.medicalRecord;
  const history = patient.medicalHistory;
  const goal = patient.treatmentGoals[0];
  const age = calculateAge(patient.birthDate);

  const assessments: AssessmentRow[] = patient.assessments.map(
    (assessment) => ({
      id: assessment.id,
      assessedAt: dayKey(assessment.assessedAt),
      dateLabel: formatDate(assessment.assessedAt),
      painLevel: assessment.painLevel,
      painLocation: assessment.painLocation ?? "",
      painScale: assessment.painScale ?? "",
      rangeOfMotion: assessment.rangeOfMotion ?? "",
      muscleStrength: assessment.muscleStrength ?? "",
      balance: assessment.balance ?? "",
      gait: assessment.gait ?? "",
      mobility: assessment.mobility ?? "",
      motorFunction: assessment.motorFunction ?? "",
      posture: assessment.posture ?? "",
      observations: assessment.observations ?? "",
    }),
  );

  const plans: PlanRow[] = patient.treatmentPlans.map((plan) => ({
    id: plan.id,
    treatmentType: plan.treatmentType ?? "",
    plannedSessions: plan.plannedSessions,
    sessionDuration: plan.sessionDuration,
    frequency: plan.frequency ?? "",
    techniques: plan.techniques ?? "",
    exercises: plan.exercises ?? "",
    goals: plan.goals ?? "",
    observations: plan.observations ?? "",
    status: plan.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={ROUTES.medicalRecords}>
            <ArrowLeft />
            Tous les dossiers
          </Link>
        </Button>

        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={`${patient.firstName} ${patient.lastName}`}
              className="size-12"
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {patient.lastName.toUpperCase()} {patient.firstName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Dossier {patient.fileNumber}
                {age !== null ? ` · ${age} ans` : ""}
                {patient.phone ? ` · ${patient.phone}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={patientPath(patient.id)}>Fiche patient</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`${ROUTES.sessions}?q=${patient.fileNumber}`}>
                <Stethoscope />
                Séances
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`${ROUTES.appointments}?statut=all`}>
                <CalendarClock />
                Agenda
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionForm
          title="Dossier médical"
          description="Motif de consultation, diagnostic et évaluation finale."
          action={saveMedicalRecord.bind(null, patient.id)}
        >
          <Field
            label="Motif de consultation"
            htmlFor="chiefComplaint"
            className="sm:col-span-2"
          >
            <Textarea
              id="chiefComplaint"
              name="chiefComplaint"
              rows={2}
              defaultValue={record?.chiefComplaint ?? ""}
            />
          </Field>
          <Field label="Diagnostic" htmlFor="diagnosis" className="sm:col-span-2">
            <Textarea
              id="diagnosis"
              name="diagnosis"
              rows={2}
              defaultValue={record?.diagnosis ?? ""}
            />
          </Field>
          <Field
            label="Évaluation finale"
            htmlFor="finalEvaluation"
            className="sm:col-span-2"
          >
            <Textarea
              id="finalEvaluation"
              name="finalEvaluation"
              rows={2}
              defaultValue={record?.finalEvaluation ?? ""}
            />
          </Field>
          <Field label="Notes" htmlFor="recordNotes" className="sm:col-span-2">
            <Textarea
              id="recordNotes"
              name="notes"
              rows={2}
              defaultValue={record?.notes ?? ""}
            />
          </Field>
        </SectionForm>

        <SectionForm
          title="Antécédents"
          description="Historique médical, chirurgical et traitements en cours."
          action={saveMedicalHistory.bind(null, patient.id)}
        >
          <Field label="Antécédents de maladie" htmlFor="diseaseHistory">
            <Textarea
              id="diseaseHistory"
              name="diseaseHistory"
              rows={2}
              defaultValue={history?.diseaseHistory ?? ""}
            />
          </Field>
          <Field label="Antécédents médicaux" htmlFor="pastMedicalHistory">
            <Textarea
              id="pastMedicalHistory"
              name="pastMedicalHistory"
              rows={2}
              defaultValue={history?.pastMedicalHistory ?? ""}
            />
          </Field>
          <Field label="Antécédents chirurgicaux" htmlFor="surgicalHistory">
            <Textarea
              id="surgicalHistory"
              name="surgicalHistory"
              rows={2}
              defaultValue={history?.surgicalHistory ?? ""}
            />
          </Field>
          <Field label="Traumatismes" htmlFor="injuries">
            <Textarea
              id="injuries"
              name="injuries"
              rows={2}
              defaultValue={history?.injuries ?? ""}
            />
          </Field>
          <Field label="Maladies chroniques" htmlFor="chronicDiseases">
            <Textarea
              id="chronicDiseases"
              name="chronicDiseases"
              rows={2}
              defaultValue={history?.chronicDiseases ?? ""}
            />
          </Field>
          <Field label="Médicaments" htmlFor="medications">
            <Textarea
              id="medications"
              name="medications"
              rows={2}
              defaultValue={history?.medications ?? ""}
            />
          </Field>
          <Field label="Allergies" htmlFor="allergies">
            <Textarea
              id="allergies"
              name="allergies"
              rows={2}
              defaultValue={history?.allergies ?? ""}
            />
          </Field>
          <Field label="Observations" htmlFor="historyObservations">
            <Textarea
              id="historyObservations"
              name="observations"
              rows={2}
              defaultValue={history?.observations ?? ""}
            />
          </Field>
        </SectionForm>
      </div>

      <SectionForm
        title="Objectifs de traitement"
        description="Objectif principal, objectifs à court et à long terme."
        action={saveTreatmentGoal.bind(null, patient.id)}
        columnsClassName="grid gap-4 sm:grid-cols-3"
      >
        <Field label="Objectif principal" htmlFor="mainGoal">
          <Textarea
            id="mainGoal"
            name="mainGoal"
            rows={3}
            defaultValue={goal?.mainGoal ?? ""}
          />
        </Field>
        <Field label="Objectifs à court terme" htmlFor="shortTermGoals">
          <Textarea
            id="shortTermGoals"
            name="shortTermGoals"
            rows={3}
            defaultValue={goal?.shortTermGoals ?? ""}
          />
        </Field>
        <Field label="Objectifs à long terme" htmlFor="longTermGoals">
          <Textarea
            id="longTermGoals"
            name="longTermGoals"
            rows={3}
            defaultValue={goal?.longTermGoals ?? ""}
          />
        </Field>
      </SectionForm>

      <AssessmentsSection
        patientId={patient.id}
        assessments={assessments}
        canManage={canManage}
        today={dayKey(new Date())}
      />

      <PlansSection
        patientId={patient.id}
        plans={plans}
        canManage={canManage}
      />

      <p className="text-xs text-muted-foreground">
        Patient inscrit le {formatDate(patient.registeredAt)}.
      </p>
    </div>
  );
}

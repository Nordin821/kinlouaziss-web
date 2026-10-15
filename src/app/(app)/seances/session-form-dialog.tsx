"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createSession, updateSession } from "@/app/actions/sessions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { PatientOption, TherapistOption } from "@/lib/options";
import {
  SESSION_STATUSES,
  SESSION_STATUS_LABELS,
  SESSION_TYPES,
  SESSION_TYPE_LABELS,
} from "@/lib/validations/session";

export type SessionExerciseRow = {
  exerciseId: number;
  repetitions: number | null;
  sets: number | null;
};

export type SessionFormData = {
  id: number;
  patientId: number;
  therapistId: number | null;
  date: string;
  startTime: string;
  duration: number | null;
  sessionType: string;
  status: string;
  reason: string;
  treatmentDone: string;
  manualTherapy: string;
  electrotherapy: string;
  thermotherapy: string;
  homeExercises: string;
  observations: string;
  painEvolution: string;
  mobilityEvolution: string;
  strengthEvolution: string;
  functionalEvolution: string;
  progress: string;
  difficulties: string;
  recommendations: string;
  exercises: SessionExerciseRow[];
};

export type ExerciseOption = { id: number; name: string };

/**
 * Génère des clés React stables pour les lignes de formuleurs.
 *
 * Compteur de module : React exige que les clés des éléments de liste soient
 * générées en dehors du rendu, donc un compteur `useState` ne convient pas ici
 * (il faudrait le lire pendant le rendu pour initialiser les lignes).
 */
let rowKeySeed = 0;
function nextRowKey(): number {
  rowKeySeed += 1;
  return rowKeySeed;
}

export function SessionFormDialog({
  patients,
  therapists,
  exercises,
  session,
  defaultDate,
  trigger,
}: {
  patients: PatientOption[];
  therapists: TherapistOption[];
  exercises: ExerciseOption[];
  session?: SessionFormData;
  defaultDate?: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    { key: number; value: SessionExerciseRow }[]
  >(() =>
    (session?.exercises ?? []).map((item) => ({
      key: nextRowKey(),
      value: item,
    })),
  );

  const isEdit = Boolean(session?.id);
  const action = isEdit ? updateSession.bind(null, session!.id) : createSession;

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await action(formData);
      if (result && "error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(isEdit ? "Séance mise à jour." : "Séance enregistrée.");
        router.refresh();
      }
    } catch {
      const message = "Une erreur est survenue. Réessayez.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la séance" : "Nouvelle séance"}
          </DialogTitle>
          <DialogDescription>
            Compte rendu de séance : traitement réalisé, évolution et exercices.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6">
          <Section title="Informations générales">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Patient"
                htmlFor="patientId"
                required
                className="sm:col-span-2"
              >
                <NativeSelect
                  id="patientId"
                  name="patientId"
                  defaultValue={session ? String(session.patientId) : ""}
                  required
                >
                  <option value="">— Sélectionner un patient —</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} ({patient.fileNumber})
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Thérapeute" htmlFor="therapistId">
                <NativeSelect
                  id="therapistId"
                  name="therapistId"
                  defaultValue={
                    session?.therapistId ? String(session.therapistId) : ""
                  }
                >
                  <option value="">— Non assigné —</option>
                  {therapists.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Type de séance" htmlFor="sessionType">
                <NativeSelect
                  id="sessionType"
                  name="sessionType"
                  defaultValue={session?.sessionType ?? "kinesitherapie"}
                >
                  {SESSION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SESSION_TYPE_LABELS[type]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Date" htmlFor="date" required>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={session?.date ?? defaultDate ?? ""}
                  required
                />
              </Field>

              <Field label="Heure" htmlFor="startTime">
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  defaultValue={session?.startTime ?? ""}
                />
              </Field>

              <Field label="Durée (minutes)" htmlFor="duration">
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min={0}
                  max={600}
                  step={5}
                  defaultValue={session?.duration ?? 45}
                />
              </Field>

              <Field label="Statut" htmlFor="status">
                <NativeSelect
                  id="status"
                  name="status"
                  defaultValue={session?.status ?? "completed"}
                >
                  {SESSION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SESSION_STATUS_LABELS[status]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </Section>

          <Section title="Motif et traitement réalisé">
            <div className="grid gap-4">
              <Field label="Motif / plainte du jour" htmlFor="reason">
                <Input
                  id="reason"
                  name="reason"
                  defaultValue={session?.reason ?? ""}
                  placeholder="Douleur, raideur, suivi post-opératoire…"
                />
              </Field>
              <Field label="Traitement réalisé" htmlFor="treatmentDone">
                <Textarea
                  id="treatmentDone"
                  name="treatmentDone"
                  rows={2}
                  defaultValue={session?.treatmentDone ?? ""}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Thérapie manuelle" htmlFor="manualTherapy">
                  <Textarea
                    id="manualTherapy"
                    name="manualTherapy"
                    rows={2}
                    defaultValue={session?.manualTherapy ?? ""}
                  />
                </Field>
                <Field label="Électrothérapie" htmlFor="electrotherapy">
                  <Textarea
                    id="electrotherapy"
                    name="electrotherapy"
                    rows={2}
                    defaultValue={session?.electrotherapy ?? ""}
                  />
                </Field>
                <Field label="Thermothérapie" htmlFor="thermotherapy">
                  <Textarea
                    id="thermotherapy"
                    name="thermotherapy"
                    rows={2}
                    defaultValue={session?.thermotherapy ?? ""}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Évolution">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Douleur" htmlFor="painEvolution">
                <Input
                  id="painEvolution"
                  name="painEvolution"
                  defaultValue={session?.painEvolution ?? ""}
                  placeholder="Diminuée, stable…"
                />
              </Field>
              <Field label="Mobilité" htmlFor="mobilityEvolution">
                <Input
                  id="mobilityEvolution"
                  name="mobilityEvolution"
                  defaultValue={session?.mobilityEvolution ?? ""}
                />
              </Field>
              <Field label="Force musculaire" htmlFor="strengthEvolution">
                <Input
                  id="strengthEvolution"
                  name="strengthEvolution"
                  defaultValue={session?.strengthEvolution ?? ""}
                />
              </Field>
              <Field label="Fonctionnel" htmlFor="functionalEvolution">
                <Input
                  id="functionalEvolution"
                  name="functionalEvolution"
                  defaultValue={session?.functionalEvolution ?? ""}
                />
              </Field>
              <Field
                label="Progression"
                htmlFor="progress"
                className="sm:col-span-2"
              >
                <Textarea
                  id="progress"
                  name="progress"
                  rows={2}
                  defaultValue={session?.progress ?? ""}
                />
              </Field>
              <Field label="Difficultés" htmlFor="difficulties">
                <Textarea
                  id="difficulties"
                  name="difficulties"
                  rows={2}
                  defaultValue={session?.difficulties ?? ""}
                />
              </Field>
              <Field label="Recommandations" htmlFor="recommendations">
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  rows={2}
                  defaultValue={session?.recommendations ?? ""}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Exercices réalisés"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    {
                      key: nextRowKey(),
                      value: { exerciseId: 0, repetitions: null, sets: null },
                    },
                  ])
                }
              >
                <Plus />
                Ajouter
              </Button>
            }
          >
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun exercice associé à cette séance.
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div
                    key={row.key}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end"
                  >
                    <Field label="Exercice" className="flex-1">
                      <NativeSelect
                        name="exerciseId"
                        defaultValue={String(row.value.exerciseId)}
                      >
                        <option value="">— Sélectionner —</option>
                        {exercises.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field label="Séries" className="sm:w-24">
                      <Input
                        name="exerciseSets"
                        type="number"
                        min={0}
                        defaultValue={row.value.sets ?? ""}
                      />
                    </Field>
                    <Field label="Rép." className="sm:w-24">
                      <Input
                        name="exerciseReps"
                        type="number"
                        min={0}
                        defaultValue={row.value.repetitions ?? ""}
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Retirer l'exercice"
                      className="text-danger"
                      onClick={() =>
                        setRows((prev) =>
                          prev.filter((item) => item.key !== row.key),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Consignes">
            <div className="grid gap-4">
              <Field
                label="Exercices à domicile"
                htmlFor="homeExercises"
              >
                <Textarea
                  id="homeExercises"
                  name="homeExercises"
                  rows={2}
                  defaultValue={session?.homeExercises ?? ""}
                />
              </Field>
              <Field label="Observations" htmlFor="observations">
                <Textarea
                  id="observations"
                  name="observations"
                  rows={2}
                  defaultValue={session?.observations ?? ""}
                />
              </Field>
            </div>
          </Section>

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Enregistrement…"
                : isEdit
                  ? "Enregistrer"
                  : "Créer la séance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

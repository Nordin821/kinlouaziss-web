"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createExercise, updateExercise } from "@/app/actions/exercises";
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
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
} from "@/lib/validations/exercise";

export type ExerciseFormData = {
  id: number;
  name: string;
  description: string;
  targetArea: string;
  goal: string;
  repetitions: number | null;
  sets: number | null;
  duration: number | null;
  difficulty: string;
  instructions: string;
  precautions: string;
  notes: string;
};

export function ExerciseFormDialog({
  exercise,
  trigger,
}: {
  exercise?: ExerciseFormData;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(exercise?.id);
  const action = isEdit
    ? updateExercise.bind(null, exercise!.id)
    : createExercise;

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
        toast.success(isEdit ? "Exercice mis à jour." : "Exercice créé.");
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'exercice" : "Nouvel exercice"}
          </DialogTitle>
          <DialogDescription>
            Décrivez l&apos;exercice pour le prescrire ensuite dans les séances.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nom de l'exercice"
              htmlFor="name"
              required
              className="sm:col-span-2"
            >
              <Input
                id="name"
                name="name"
                defaultValue={exercise?.name ?? ""}
                placeholder="Ex. Renforcement du quadriceps"
                required
              />
            </Field>

            <Field label="Zone ciblée" htmlFor="targetArea">
              <Input
                id="targetArea"
                name="targetArea"
                defaultValue={exercise?.targetArea ?? ""}
                placeholder="Genou, épaule, lombaires…"
              />
            </Field>

            <Field label="Objectif" htmlFor="goal">
              <Input
                id="goal"
                name="goal"
                defaultValue={exercise?.goal ?? ""}
                placeholder="Renforcer, assouplir, stabiliser…"
              />
            </Field>

            <Field label="Répétitions" htmlFor="repetitions">
              <Input
                id="repetitions"
                name="repetitions"
                type="number"
                min={0}
                max={1000}
                defaultValue={exercise?.repetitions ?? ""}
              />
            </Field>

            <Field label="Séries" htmlFor="sets">
              <Input
                id="sets"
                name="sets"
                type="number"
                min={0}
                max={100}
                defaultValue={exercise?.sets ?? ""}
              />
            </Field>

            <Field label="Durée (secondes)" htmlFor="duration">
              <Input
                id="duration"
                name="duration"
                type="number"
                min={0}
                max={600}
                defaultValue={exercise?.duration ?? ""}
              />
            </Field>

            <Field label="Difficulté" htmlFor="difficulty">
              <NativeSelect
                id="difficulty"
                name="difficulty"
                defaultValue={exercise?.difficulty ?? "moyen"}
              >
                {DIFFICULTY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {DIFFICULTY_LABELS[level]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              className="sm:col-span-2"
            >
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={exercise?.description ?? ""}
                placeholder="Description courte de l'exercice…"
              />
            </Field>

            <Field
              label="Consignes"
              htmlFor="instructions"
              className="sm:col-span-2"
            >
              <Textarea
                id="instructions"
                name="instructions"
                rows={3}
                defaultValue={exercise?.instructions ?? ""}
                placeholder="Déroulement, posture, respiration…"
              />
            </Field>

            <Field label="Précautions" htmlFor="precautions">
              <Textarea
                id="precautions"
                name="precautions"
                rows={2}
                defaultValue={exercise?.precautions ?? ""}
                placeholder="Contre-indications, points de vigilance…"
              />
            </Field>

            <Field label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={exercise?.notes ?? ""}
              />
            </Field>
          </div>

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
                  : "Créer l'exercice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

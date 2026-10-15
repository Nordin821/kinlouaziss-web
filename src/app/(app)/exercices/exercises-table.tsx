"use client";

import { useTransition } from "react";
import { Dumbbell, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteExercise } from "@/app/actions/exercises";
import { EmptyState } from "@/components/ui/empty-state";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS, type DifficultyLevel } from "@/lib/validations/exercise";

import {
  ExerciseFormDialog,
  type ExerciseFormData,
} from "./exercise-form-dialog";

export type ExerciseRow = ExerciseFormData;

const DIFFICULTY_TONE: Record<DifficultyLevel, "success" | "warning" | "danger"> =
  {
    facile: "success",
    moyen: "warning",
    difficile: "danger",
  };

function difficultyBadge(value: string) {
  const tone =
    DIFFICULTY_TONE[value as DifficultyLevel] ?? "neutral";
  return (
    <span className={cn(badgeVariants({ variant: tone as "success" }))}>
      {DIFFICULTY_LABELS[value as DifficultyLevel] ?? value}
    </span>
  );
}

export function ExercisesTable({ exercises }: { exercises: ExerciseRow[] }) {
  const [pending, startTransition] = useTransition();

  function handleDelete(exercise: ExerciseRow) {
    startTransition(async () => {
      const result = await deleteExercise(exercise.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Exercice supprimé.");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Exercice</TableHead>
            <TableHead>Zone ciblée</TableHead>
            <TableHead>Prescription</TableHead>
            <TableHead>Difficulté</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.length === 0 ? (
            <TableEmpty colSpan={5}>
              <EmptyState
                icon={Dumbbell}
                title="Aucun exercice"
                description="Créez des exercices pour les prescrire dans les séances de vos patients."
              />
            </TableEmpty>
          ) : (
            exercises.map((exercise) => (
              <TableRow key={exercise.id}>
                <TableCell>
                  <span className="block font-medium">{exercise.name}</span>
                  {exercise.goal ? (
                    <span className="block text-xs text-muted-foreground">
                      {exercise.goal}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {exercise.targetArea ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatPrescription(exercise)}
                </TableCell>
                <TableCell>{difficultyBadge(exercise.difficulty)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <ExerciseFormDialog
                        exercise={exercise}
                        trigger={
                          <DropdownMenuItem
                            disabled={pending}
                            onSelect={(event) => event.preventDefault()}
                          >
                            <Pencil />
                            Modifier
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuSeparator />
                      <ConfirmDialog
                        title="Supprimer l'exercice"
                        description={`« ${exercise.name} » sera retiré de la bibliothèque.`}
                        confirmLabel="Supprimer"
                        destructive
                        onConfirm={() => handleDelete(exercise)}
                        trigger={
                          <DropdownMenuItem
                            disabled={pending}
                            onSelect={(event) => event.preventDefault()}
                            className="text-danger focus:text-danger"
                          >
                            <Trash2 />
                            Supprimer
                          </DropdownMenuItem>
                        }
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function formatPrescription(exercise: ExerciseRow): string {
  const parts: string[] = [];
  if (exercise.sets) parts.push(`${exercise.sets} séries`);
  if (exercise.repetitions) parts.push(`${exercise.repetitions} rép.`);
  if (exercise.duration) parts.push(`${exercise.duration} s`);
  return parts.length ? parts.join(" × ") : "—";
}

export function NewExerciseButton() {
  return (
    <ExerciseFormDialog
      trigger={
        <Button>
          <Plus />
          Nouvel exercice
        </Button>
      }
    />
  );
}

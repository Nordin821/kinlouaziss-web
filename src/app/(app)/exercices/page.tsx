import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requirePermission, userHasPermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVELS,
} from "@/lib/validations/exercise";

import {
  ExercisesTable,
  NewExerciseButton,
  type ExerciseRow,
} from "./exercises-table";

export const metadata = { title: "Exercices" };

export default async function ExercisesPage({
  searchParams,
}: PageProps<"/exercices">) {
  const user = await requirePermission("exercises.view");
  const canManage = userHasPermission(user, "exercises.manage");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const difficulty = typeof params.difficulte === "string" ? params.difficulte : "all";

  const exercises = await prisma.exercise.findMany({
    where: {
      deletedAt: null,
      ...(difficulty !== "all" &&
      (DIFFICULTY_LEVELS as readonly string[]).includes(difficulty)
        ? { difficulty }
        : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { targetArea: { contains: query, mode: "insensitive" as const } },
              { goal: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
  });

  const rows: ExerciseRow[] = exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    description: exercise.description ?? "",
    targetArea: exercise.targetArea ?? "",
    goal: exercise.goal ?? "",
    repetitions: exercise.repetitions,
    sets: exercise.sets,
    duration: exercise.duration,
    difficulty: exercise.difficulty ?? "moyen",
    instructions: exercise.instructions ?? "",
    precautions: exercise.precautions ?? "",
    notes: exercise.notes ?? "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercices"
        description={`${exercises.length} exercice${exercises.length > 1 ? "s" : ""} dans la bibliothèque`}
        actions={
          <>
            <RefreshButton />
            {canManage ? <NewExerciseButton /> : null}
          </>
        }
      />

      <Card className="p-4">
        <form
          method="get"
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Rechercher un exercice, une zone ciblée…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select name="difficulte" defaultValue={difficulty}>
              <SelectTrigger className="w-40">
                <SlidersHorizontal className="size-4 opacity-60" />
                <SelectValue placeholder="Difficulté" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes difficultés</SelectItem>
                {DIFFICULTY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {DIFFICULTY_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </div>
        </form>
      </Card>

      <ExercisesTable exercises={rows} />
    </div>
  );
}

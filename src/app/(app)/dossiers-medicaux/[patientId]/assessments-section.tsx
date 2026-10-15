"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteAssessment, saveAssessment } from "@/app/actions/medical-records";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AssessmentRow = {
  id: number;
  assessedAt: string;
  dateLabel: string;
  painLevel: number | null;
  painLocation: string;
  painScale: string;
  rangeOfMotion: string;
  muscleStrength: string;
  balance: string;
  gait: string;
  mobility: string;
  motorFunction: string;
  posture: string;
  observations: string;
};

function painTone(level: number | null): "success" | "warning" | "danger" | "neutral" {
  if (level === null) return "neutral";
  if (level <= 3) return "success";
  if (level <= 6) return "warning";
  return "danger";
}

export function AssessmentsSection({
  patientId,
  assessments,
  canManage,
  today,
}: {
  patientId: number;
  assessments: AssessmentRow[];
  canManage: boolean;
  today: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete(assessment: AssessmentRow) {
    startTransition(async () => {
      const result = await deleteAssessment(patientId, assessment.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Évaluation supprimée.");
    });
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Bilans et évaluations</h2>
          <p className="text-sm text-muted-foreground">
            Douleur, mobilité, force et fonction à chaque étape du suivi.
          </p>
        </div>
        {canManage ? (
          <AssessmentDialog
            patientId={patientId}
            defaultDate={today}
            trigger={
              <Button size="sm">
                <Plus />
                Nouveau bilan
              </Button>
            }
          />
        ) : null}
      </div>

      {assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun bilan"
          description="Enregistrez une première évaluation pour suivre l'évolution du patient."
        />
      ) : (
        <div className="space-y-3">
          {assessments.map((assessment) => (
            <div
              key={assessment.id}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {assessment.dateLabel}
                  </span>
                  <span
                    className={cn(
                      badgeVariants({ variant: painTone(assessment.painLevel) }),
                    )}
                  >
                    Douleur{" "}
                    {assessment.painLevel !== null
                      ? `${assessment.painLevel}/10`
                      : "—"}
                  </span>
                  {assessment.painLocation ? (
                    <span className="text-xs text-muted-foreground">
                      {assessment.painLocation}
                    </span>
                  ) : null}
                </div>
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <AssessmentDialog
                        patientId={patientId}
                        assessment={assessment}
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
                        title="Supprimer le bilan"
                        description={`Le bilan du ${assessment.dateLabel} sera définitivement supprimé.`}
                        confirmLabel="Supprimer"
                        destructive
                        onConfirm={() => handleDelete(assessment)}
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
                ) : null}
              </div>

              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Mobilité" value={assessment.mobility} />
                <Detail label="Amplitude" value={assessment.rangeOfMotion} />
                <Detail label="Force" value={assessment.muscleStrength} />
                <Detail label="Équilibre" value={assessment.balance} />
                <Detail label="Marche" value={assessment.gait} />
                <Detail label="Posture" value={assessment.posture} />
                <Detail label="Fonction motrice" value={assessment.motorFunction} />
                <Detail label="Échelle" value={assessment.painScale} />
                <Detail
                  label="Observations"
                  value={assessment.observations}
                  full
                />
              </dl>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={full ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}

function AssessmentDialog({
  patientId,
  assessment,
  defaultDate,
  trigger,
}: {
  patientId: number;
  assessment?: AssessmentRow;
  defaultDate?: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(assessment?.id);
  const action = saveAssessment.bind(null, patientId, assessment?.id ?? null);

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
        toast.success(isEdit ? "Bilan mis à jour." : "Bilan enregistré.");
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
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
            {isEdit ? "Modifier le bilan" : "Nouveau bilan"}
          </DialogTitle>
          <DialogDescription>
            Évaluation clinique à une date donnée.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date du bilan" htmlFor="assessedAt" required>
              <Input
                id="assessedAt"
                name="assessedAt"
                type="date"
                defaultValue={assessment?.assessedAt ?? defaultDate ?? ""}
                required
              />
            </Field>
            <Field label="Niveau de douleur (0-10)" htmlFor="painLevel">
              <Input
                id="painLevel"
                name="painLevel"
                type="number"
                min={0}
                max={10}
                defaultValue={assessment?.painLevel ?? ""}
              />
            </Field>
            <Field label="Localisation de la douleur" htmlFor="painLocation">
              <Input
                id="painLocation"
                name="painLocation"
                defaultValue={assessment?.painLocation ?? ""}
              />
            </Field>
            <Field label="Échelle utilisée" htmlFor="painScale">
              <Input
                id="painScale"
                name="painScale"
                defaultValue={assessment?.painScale ?? ""}
                placeholder="EVA, EVS…"
              />
            </Field>
            <Field
              label="Amplitude articulaire"
              htmlFor="rangeOfMotion"
              className="sm:col-span-2"
            >
              <Textarea
                id="rangeOfMotion"
                name="rangeOfMotion"
                rows={2}
                defaultValue={assessment?.rangeOfMotion ?? ""}
              />
            </Field>
            <Field
              label="Force musculaire"
              htmlFor="muscleStrength"
              className="sm:col-span-2"
            >
              <Textarea
                id="muscleStrength"
                name="muscleStrength"
                rows={2}
                defaultValue={assessment?.muscleStrength ?? ""}
              />
            </Field>
            <Field label="Équilibre" htmlFor="balance">
              <Input
                id="balance"
                name="balance"
                defaultValue={assessment?.balance ?? ""}
              />
            </Field>
            <Field label="Marche" htmlFor="gait">
              <Input
                id="gait"
                name="gait"
                defaultValue={assessment?.gait ?? ""}
              />
            </Field>
            <Field label="Mobilité" htmlFor="mobility">
              <Input
                id="mobility"
                name="mobility"
                defaultValue={assessment?.mobility ?? ""}
              />
            </Field>
            <Field label="Posture" htmlFor="posture">
              <Input
                id="posture"
                name="posture"
                defaultValue={assessment?.posture ?? ""}
              />
            </Field>
            <Field
              label="Fonction motrice"
              htmlFor="motorFunction"
              className="sm:col-span-2"
            >
              <Textarea
                id="motorFunction"
                name="motorFunction"
                rows={2}
                defaultValue={assessment?.motorFunction ?? ""}
              />
            </Field>
            <Field
              label="Observations"
              htmlFor="observations"
              className="sm:col-span-2"
            >
              <Textarea
                id="observations"
                name="observations"
                rows={2}
                defaultValue={assessment?.observations ?? ""}
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
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

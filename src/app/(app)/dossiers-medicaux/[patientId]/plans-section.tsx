"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteTreatmentPlan,
  saveTreatmentPlan,
} from "@/app/actions/medical-records";
import { StatusBadge } from "@/components/status-badge";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
} from "@/lib/validations/medical-record";

export type PlanRow = {
  id: number;
  treatmentType: string;
  plannedSessions: number | null;
  sessionDuration: number | null;
  frequency: string;
  techniques: string;
  exercises: string;
  goals: string;
  observations: string;
  status: string;
};

export function PlansSection({
  patientId,
  plans,
  canManage,
}: {
  patientId: number;
  plans: PlanRow[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete(plan: PlanRow) {
    startTransition(async () => {
      const result = await deleteTreatmentPlan(patientId, plan.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Plan de traitement supprimé.");
    });
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Plans de traitement</h2>
          <p className="text-sm text-muted-foreground">
            Type de traitement, nombre de séances, techniques et objectifs.
          </p>
        </div>
        {canManage ? (
          <PlanDialog
            patientId={patientId}
            trigger={
              <Button size="sm">
                <Plus />
                Nouveau plan
              </Button>
            }
          />
        ) : null}
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucun plan de traitement"
          description="Définissez un plan pour structurer la prise en charge du patient."
        />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {plan.treatmentType || "Plan de traitement"}
                  </span>
                  <StatusBadge status={plan.status} />
                  {plan.plannedSessions ? (
                    <span className="text-xs text-muted-foreground">
                      {plan.plannedSessions} séances
                      {plan.sessionDuration
                        ? ` de ${plan.sessionDuration} min`
                        : ""}
                    </span>
                  ) : null}
                  {plan.frequency ? (
                    <span className="text-xs text-muted-foreground">
                      · {plan.frequency}
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
                      <PlanDialog
                        patientId={patientId}
                        plan={plan}
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
                        title="Supprimer le plan"
                        description="Ce plan de traitement sera définitivement supprimé."
                        confirmLabel="Supprimer"
                        destructive
                        onConfirm={() => handleDelete(plan)}
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

              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <Detail label="Techniques" value={plan.techniques} />
                <Detail label="Exercices" value={plan.exercises} />
                <Detail label="Objectifs" value={plan.goals} />
                <Detail label="Observations" value={plan.observations} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}

function PlanDialog({
  patientId,
  plan,
  trigger,
}: {
  patientId: number;
  plan?: PlanRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(plan?.id);
  const action = saveTreatmentPlan.bind(null, patientId, plan?.id ?? null);

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
        toast.success(isEdit ? "Plan mis à jour." : "Plan créé.");
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
            {isEdit ? "Modifier le plan" : "Nouveau plan de traitement"}
          </DialogTitle>
          <DialogDescription>
            Structurez la prise en charge : fréquence, techniques et objectifs.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Type de traitement"
              htmlFor="treatmentType"
              className="sm:col-span-2"
            >
              <Input
                id="treatmentType"
                name="treatmentType"
                defaultValue={plan?.treatmentType ?? ""}
                placeholder="Rééducation du genou, lombalgie…"
              />
            </Field>
            <Field label="Séances prévues" htmlFor="plannedSessions">
              <Input
                id="plannedSessions"
                name="plannedSessions"
                type="number"
                min={0}
                max={500}
                defaultValue={plan?.plannedSessions ?? ""}
              />
            </Field>
            <Field label="Durée par séance (min)" htmlFor="sessionDuration">
              <Input
                id="sessionDuration"
                name="sessionDuration"
                type="number"
                min={0}
                max={600}
                step={5}
                defaultValue={plan?.sessionDuration ?? ""}
              />
            </Field>
            <Field label="Fréquence" htmlFor="frequency">
              <Input
                id="frequency"
                name="frequency"
                defaultValue={plan?.frequency ?? ""}
                placeholder="2 fois par semaine"
              />
            </Field>
            <Field label="Statut" htmlFor="status">
              <NativeSelect
                id="status"
                name="status"
                defaultValue={plan?.status ?? "active"}
              >
                {PLAN_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PLAN_STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Techniques"
              htmlFor="techniques"
              className="sm:col-span-2"
            >
              <Textarea
                id="techniques"
                name="techniques"
                rows={2}
                defaultValue={plan?.techniques ?? ""}
              />
            </Field>
            <Field label="Exercices" htmlFor="exercises" className="sm:col-span-2">
              <Textarea
                id="exercises"
                name="exercises"
                rows={2}
                defaultValue={plan?.exercises ?? ""}
              />
            </Field>
            <Field label="Objectifs" htmlFor="goals" className="sm:col-span-2">
              <Textarea
                id="goals"
                name="goals"
                rows={2}
                defaultValue={plan?.goals ?? ""}
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
                defaultValue={plan?.observations ?? ""}
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

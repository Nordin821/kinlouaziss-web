"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  createTherapist,
  deleteTherapist,
  setTherapistStatus,
  updateTherapist,
} from "@/app/actions/therapists";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
  THERAPIST_STATUSES,
  THERAPIST_STATUS_LABELS,
} from "@/lib/validations/therapist";

export type TherapistRow = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  specialty: string;
  professionalNumber: string;
  status: string;
  notes: string;
};

export function TherapistsSection({ therapists }: { therapists: TherapistRow[] }) {
  const [pending, startTransition] = useTransition();

  function handleStatus(therapist: TherapistRow, status: string) {
    startTransition(async () => {
      const result = await setTherapistStatus(therapist.id, status);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Statut mis à jour.");
    });
  }

  function handleDelete(therapist: TherapistRow) {
    startTransition(async () => {
      const result = await deleteTherapist(therapist.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Thérapeute supprimé.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Thérapeutes du cabinet</h2>
          <p className="text-sm text-muted-foreground">
            Les thérapeutes actifs apparaissent dans l&apos;agenda et les
            séances.
          </p>
        </div>
        <TherapistFormDialog
          trigger={
            <Button size="sm">
              <Plus />
              Ajouter
            </Button>
          }
        />
      </div>

      {therapists.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun thérapeute"
          description="Ajoutez les praticiens du cabinet pour les assigner aux rendez-vous et aux séances."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {therapists.map((therapist) => (
            <div
              key={therapist.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={`${therapist.firstName} ${therapist.lastName}`}
                    className="size-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {therapist.firstName} {therapist.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {therapist.specialty || "Spécialité non renseignée"}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <TherapistFormDialog
                      therapist={therapist}
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
                    {therapist.status === "active" ? (
                      <DropdownMenuItem
                        disabled={pending}
                        onSelect={(event) => {
                          event.preventDefault();
                          handleStatus(therapist, "inactive");
                        }}
                      >
                        <UserX />
                        Désactiver
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        disabled={pending}
                        onSelect={(event) => {
                          event.preventDefault();
                          handleStatus(therapist, "active");
                        }}
                      >
                        <UserCheck />
                        Activer
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <ConfirmDialog
                      title="Supprimer le thérapeute"
                      description={`${therapist.firstName} ${therapist.lastName} sera retiré des listes de sélection. Les séances passées sont conservées.`}
                      confirmLabel="Supprimer"
                      destructive
                      onConfirm={() => handleDelete(therapist)}
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
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={therapist.status} />
                {therapist.phone ? <span>{therapist.phone}</span> : null}
                {therapist.email ? <span>· {therapist.email}</span> : null}
                {therapist.professionalNumber ? (
                  <span>· N° {therapist.professionalNumber}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TherapistFormDialog({
  therapist,
  trigger,
}: {
  therapist?: TherapistRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(therapist?.id);
  const action = isEdit
    ? updateTherapist.bind(null, therapist!.id)
    : createTherapist;

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
        toast.success(isEdit ? "Thérapeute mis à jour." : "Thérapeute ajouté.");
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le thérapeute" : "Nouveau thérapeute"}
          </DialogTitle>
          <DialogDescription>
            Fiche du praticien utilisée dans l&apos;agenda et les comptes rendus.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="firstName" required>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={therapist?.firstName ?? ""}
                required
              />
            </Field>
            <Field label="Nom" htmlFor="lastName" required>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={therapist?.lastName ?? ""}
                required
              />
            </Field>
            <Field label="Téléphone" htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                defaultValue={therapist?.phone ?? ""}
              />
            </Field>
            <Field label="E-mail" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={therapist?.email ?? ""}
              />
            </Field>
            <Field label="Spécialité" htmlFor="specialty">
              <Input
                id="specialty"
                name="specialty"
                defaultValue={therapist?.specialty ?? ""}
                placeholder="Kinésithérapie, rééducation…"
              />
            </Field>
            <Field label="N° professionnel" htmlFor="professionalNumber">
              <Input
                id="professionalNumber"
                name="professionalNumber"
                defaultValue={therapist?.professionalNumber ?? ""}
              />
            </Field>
            <Field label="Statut" htmlFor="status" className="sm:col-span-2">
              <NativeSelect
                id="status"
                name="status"
                defaultValue={therapist?.status ?? "active"}
              >
                {THERAPIST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {THERAPIST_STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={therapist?.notes ?? ""}
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

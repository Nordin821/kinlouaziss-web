"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createAppointment,
  updateAppointment,
} from "@/app/actions/appointments";
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
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/validations/appointment";
import {
  SESSION_TYPES,
  SESSION_TYPE_LABELS,
} from "@/lib/validations/session";

export type AppointmentFormData = {
  id: number;
  patientId: number;
  therapistId: number | null;
  date: string;
  startTime: string;
  duration: number;
  sessionType: string;
  status: string;
  notes: string;
};

export function AppointmentFormDialog({
  patients,
  therapists,
  appointment,
  defaultDate,
  trigger,
}: {
  patients: PatientOption[];
  therapists: TherapistOption[];
  appointment?: AppointmentFormData;
  defaultDate?: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = Boolean(appointment?.id);
  const action = isEdit
    ? updateAppointment.bind(null, appointment!.id)
    : createAppointment;

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
        toast.success(
          isEdit ? "Rendez-vous mis à jour." : "Rendez-vous enregistré.",
        );
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setError(null);
          formRef.current?.reset();
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription>
            Planifiez un créneau pour un patient. Le passage au statut «
            Terminé » crée automatiquement la séance.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
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
                defaultValue={
                  appointment ? String(appointment.patientId) : ""
                }
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
                  appointment?.therapistId ? String(appointment.therapistId) : ""
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
                defaultValue={appointment?.sessionType ?? "kinesitherapie"}
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
                defaultValue={appointment?.date ?? defaultDate ?? ""}
                required
              />
            </Field>

            <Field label="Heure de début" htmlFor="startTime" required>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                step={300}
                defaultValue={appointment?.startTime ?? "09:00"}
                required
              />
            </Field>

            <Field label="Durée (minutes)" htmlFor="duration" required>
              <Input
                id="duration"
                name="duration"
                type="number"
                min={5}
                max={480}
                step={5}
                defaultValue={appointment?.duration ?? 45}
                required
              />
            </Field>

            <Field label="Statut" htmlFor="status">
              <NativeSelect
                id="status"
                name="status"
                defaultValue={appointment?.status ?? "planned"}
              >
                {APPOINTMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {APPOINTMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={appointment?.notes ?? ""}
                placeholder="Motif, remarques, consignes…"
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
                  : "Planifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

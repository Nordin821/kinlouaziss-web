"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createPatient, updatePatient } from "@/app/actions/patients";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GENDERS,
  GENDER_LABELS,
  PATIENT_STATUSES,
  PATIENT_STATUS_LABELS,
} from "@/lib/validations/patient";
import { toDateInputValue } from "@/lib/format";

export type PatientFormData = {
  id?: number;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  occupation: string | null;
  referringDoctor: string | null;
  referringDoctorPhone: string | null;
  status: string;
  notes: string | null;
};

export function PatientFormDialog({
  patient,
  trigger,
}: {
  patient?: PatientFormData;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const action = patient?.id
    ? updatePatient.bind(null, patient.id)
    : createPatient;

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
          patient?.id ? "Patient mis à jour." : "Patient enregistré.",
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setError(null);
      formRef.current?.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {patient?.id ? "Modifier le patient" : "Nouveau patient"}
          </DialogTitle>
          <DialogDescription>
            {patient?.id
              ? "Mettez à jour les informations administratives du patient."
              : "Renseignez les informations administratives du patient. Un numéro de dossier sera attribué automatiquement."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" htmlFor="lastName" required>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={patient?.lastName ?? ""}
                required
              />
            </Field>
            <Field label="Prénom" htmlFor="firstName" required>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={patient?.firstName ?? ""}
                required
              />
            </Field>
            <Field label="Sexe" htmlFor="gender">
              <Select name="gender" defaultValue={patient?.gender ?? "unspecified"}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {GENDER_LABELS[gender]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date de naissance" htmlFor="birthDate">
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={toDateInputValue(patient?.birthDate)}
              />
            </Field>
            <Field label="Téléphone" htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                defaultValue={patient?.phone ?? ""}
                placeholder="06 12 34 56 78"
              />
            </Field>
            <Field label="Adresse e-mail" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={patient?.email ?? ""}
              />
            </Field>
            <Field label="Ville" htmlFor="city">
              <Input id="city" name="city" defaultValue={patient?.city ?? ""} />
            </Field>
            <Field label="Profession" htmlFor="occupation">
              <Input
                id="occupation"
                name="occupation"
                defaultValue={patient?.occupation ?? ""}
              />
            </Field>
            <Field label="Médecin traitant" htmlFor="referringDoctor">
              <Input
                id="referringDoctor"
                name="referringDoctor"
                defaultValue={patient?.referringDoctor ?? ""}
              />
            </Field>
            <Field
              label="Téléphone du médecin"
              htmlFor="referringDoctorPhone"
            >
              <Input
                id="referringDoctorPhone"
                name="referringDoctorPhone"
                defaultValue={patient?.referringDoctorPhone ?? ""}
              />
            </Field>
            <Field label="Statut" htmlFor="status">
              <Select name="status" defaultValue={patient?.status ?? "active"}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {PATIENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {PATIENT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Adresse" htmlFor="address">
            <Input id="address" name="address" defaultValue={patient?.address ?? ""} />
          </Field>

          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              defaultValue={patient?.notes ?? ""}
              rows={3}
            />
          </Field>

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

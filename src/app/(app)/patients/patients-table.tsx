"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { deletePatient } from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { patientPath } from "@/lib/constants";
import { calculateAge, formatDate } from "@/lib/format";

import {
  PatientFormDialog,
  type PatientFormData,
} from "./patient-form-dialog";

export type PatientRow = PatientFormData & {
  fileNumber: string;
  registeredAt: string;
};

export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  const [pending, startTransition] = useTransition();

  function handleDelete(patient: PatientRow) {
    startTransition(async () => {
      await deletePatient(patient.id as number);
      toast.success("Patient supprimé.");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Dossier</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Ville</TableHead>
            <TableHead>Inscription</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.length === 0 ? (
            <TableEmpty colSpan={7}>
              <EmptyState
                icon={Users}
                title="Aucun patient"
                description="Ajoutez un premier patient pour commencer à gérer le cabinet."
              />
            </TableEmpty>
          ) : (
            patients.map((patient) => {
              const age = calculateAge(patient.birthDate);
              return (
                <TableRow key={patient.id}>
                  <TableCell>
                    <Link
                      href={patientPath(patient.id as number)}
                      className="flex items-center gap-3"
                    >
                      <Avatar name={`${patient.firstName} ${patient.lastName}`} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {patient.lastName.toUpperCase()} {patient.firstName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {age !== null ? `${age} ans` : "Âge non renseigné"}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {patient.fileNumber}
                  </TableCell>
                  <TableCell>{patient.phone ?? "—"}</TableCell>
                  <TableCell>{patient.city ?? "—"}</TableCell>
                  <TableCell>{formatDate(patient.registeredAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={patient.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={patientPath(patient.id as number)}>
                            <Eye />
                            Consulter
                          </Link>
                        </DropdownMenuItem>
                        <PatientFormDialog
                          patient={patient}
                          trigger={
                            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                              <Pencil />
                              Modifier
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuSeparator />
                        <ConfirmDialog
                          title="Supprimer le patient"
                          description={`Le patient ${patient.lastName.toUpperCase()} ${patient.firstName} sera retiré des listes. Un administrateur peut le restaurer.`}
                          confirmLabel="Supprimer"
                          destructive
                          onConfirm={() => handleDelete(patient)}
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
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function NewPatientButton() {
  return (
    <PatientFormDialog
      trigger={
        <Button>
          <Plus />
          Nouveau patient
        </Button>
      }
    />
  );
}

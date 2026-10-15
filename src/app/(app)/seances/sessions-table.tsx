"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { deleteSession } from "@/app/actions/sessions";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
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
import type { PatientOption, TherapistOption } from "@/lib/options";

import {
  SessionFormDialog,
  type ExerciseOption,
  type SessionFormData,
} from "./session-form-dialog";

export type SessionRow = SessionFormData & {
  patientName: string;
  patientFile: string;
  therapistName: string | null;
  dateLabel: string;
  sessionTypeLabel: string;
};

export function SessionsTable({
  sessions,
  patients,
  therapists,
  exercises,
  canManage,
}: {
  sessions: SessionRow[];
  patients: PatientOption[];
  therapists: TherapistOption[];
  exercises: ExerciseOption[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete(session: SessionRow) {
    startTransition(async () => {
      const result = await deleteSession(session.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Séance supprimée.");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Thérapeute</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Exercices</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableEmpty colSpan={7}>
              <EmptyState
                icon={Stethoscope}
                title="Aucune séance"
                description="Enregistrez une séance réalisée pour suivre la progression du patient."
              />
            </TableEmpty>
          ) : (
            sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="whitespace-nowrap">
                  <span className="block font-medium">{session.dateLabel}</span>
                  {session.startTime ? (
                    <span className="block text-xs text-muted-foreground">
                      {session.startTime}
                      {session.duration ? ` · ${session.duration} min` : ""}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Link href={`/patients/${session.patientId}`}>
                    <span className="flex items-center gap-2">
                      <Avatar name={session.patientName} className="size-8" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {session.patientName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {session.patientFile}
                        </span>
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {session.therapistName ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {session.sessionTypeLabel}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {session.exercises.length || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={session.status} />
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
                        <Link href={`/seances/${session.id}`}>
                          <Eye />
                          Compte rendu
                        </Link>
                      </DropdownMenuItem>
                      {canManage ? (
                        <>
                          <SessionFormDialog
                            patients={patients}
                            therapists={therapists}
                            exercises={exercises}
                            session={session}
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
                            title="Supprimer la séance"
                            description={`La séance de ${session.patientName} du ${session.dateLabel} sera supprimée.`}
                            confirmLabel="Supprimer"
                            destructive
                            onConfirm={() => handleDelete(session)}
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
                        </>
                      ) : null}
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

export function NewSessionButton({
  patients,
  therapists,
  exercises,
  defaultDate,
}: {
  patients: PatientOption[];
  therapists: TherapistOption[];
  exercises: ExerciseOption[];
  defaultDate: string;
}) {
  return (
    <SessionFormDialog
      patients={patients}
      therapists={therapists}
      exercises={exercises}
      defaultDate={defaultDate}
      trigger={
        <Button>
          <Plus />
          Nouvelle séance
        </Button>
      }
    />
  );
}

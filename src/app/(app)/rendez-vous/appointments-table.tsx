"use client";

import { useTransition } from "react";
import {
  CalendarClock,
  CalendarPlus,
  Clock,
  MoreHorizontal,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteAppointment,
  postponeAppointment,
  repeatWeeklyAppointment,
  setAppointmentStatus,
} from "@/app/actions/appointments";
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
import type { PatientOption, TherapistOption } from "@/lib/options";
import { StatusBadge } from "@/components/status-badge";

import {
  AppointmentFormDialog,
  type AppointmentFormData,
} from "./appointment-form-dialog";

export type AppointmentRow = AppointmentFormData & {
  patientName: string;
  patientFile: string;
  therapistName: string | null;
  sessionTypeLabel: string;
  timeLabel: string;
  endTimeLabel: string;
};

export type AppointmentDay = {
  dayKey: string;
  dayLabel: string;
  isToday: boolean;
  rows: AppointmentRow[];
};

const STATUS_ACTIONS: { status: string; label: string }[] = [
  { status: "confirmed", label: "Marquer confirmé" },
  { status: "completed", label: "Marquer terminé" },
  { status: "no_show", label: "Marquer absent" },
  { status: "cancelled", label: "Annuler le rendez-vous" },
];

export function AppointmentsView({
  days,
  patients,
  therapists,
  todayKey,
  canManage,
}: {
  days: AppointmentDay[];
  patients: PatientOption[];
  therapists: TherapistOption[];
  todayKey: string;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const total = days.reduce((sum, day) => sum + day.rows.length, 0);

  function changeStatus(row: AppointmentRow, status: string, label: string) {
    startTransition(async () => {
      const result = await setAppointmentStatus(row.id, status);
      if (result && "error" in result) toast.error(result.error);
      else toast.success(label);
    });
  }

  async function handleDelete(row: AppointmentRow) {
    const result = await deleteAppointment(row.id);
    if (result && "error" in result) toast.error(result.error);
    else toast.success("Rendez-vous supprimé.");
  }

  function handlePostpone(row: AppointmentRow) {
    startTransition(async () => {
      const result = await postponeAppointment(row.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Rendez-vous reporté d'un jour.");
    });
  }

  function handleRepeat(row: AppointmentRow) {
    startTransition(async () => {
      const result = await repeatWeeklyAppointment(row.id, 4);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Rendez-vous répété sur les 4 prochaines semaines.");
    });
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <EmptyState
          icon={CalendarPlus}
          title="Aucun rendez-vous cette semaine"
          description="Planifiez un créneau pour un patient, ou déplacez-vous à la semaine suivante."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.dayKey} className="space-y-2">
          <header className="flex items-center gap-2">
            <h2 className="text-sm font-semibold capitalize">{day.dayLabel}</h2>
            {day.isToday ? (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground">
                Aujourd&apos;hui
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {day.rows.length} rendez-vous
            </span>
          </header>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Heure</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Thérapeute</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  {canManage ? (
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {day.rows.length === 0 ? (
                  <TableEmpty colSpan={canManage ? 6 : 5}>
                    <span className="text-sm text-muted-foreground">
                      Aucun rendez-vous
                    </span>
                  </TableEmpty>
                ) : (
                  day.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-muted-foreground" />
                          {row.timeLabel}
                          <span className="text-xs font-normal text-muted-foreground">
                            → {row.endTimeLabel}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Avatar name={row.patientName} className="size-8" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {row.patientName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {row.patientFile}
                            </span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.therapistName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.sessionTypeLabel}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Actions"
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <AppointmentFormDialog
                                patients={patients}
                                therapists={therapists}
                                defaultDate={todayKey}
                                appointment={row}
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
                              {STATUS_ACTIONS.filter(
                                (action) => action.status !== row.status,
                              ).map((action) => (
                                <DropdownMenuItem
                                  key={action.status}
                                  disabled={pending}
                                  onSelect={() =>
                                    changeStatus(row, action.status, action.label)
                                  }
                                >
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={pending}
                                onSelect={() => handlePostpone(row)}
                              >
                                <CalendarClock />
                                Reporter d&apos;un jour
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={pending}
                                onSelect={() => handleRepeat(row)}
                              >
                                <Repeat />
                                Répéter chaque semaine
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <ConfirmDialog
                                title="Supprimer le rendez-vous"
                                description={`Le rendez-vous de ${row.patientName} du ${day.dayLabel} à ${row.timeLabel} sera supprimé.`}
                                confirmLabel="Supprimer"
                                destructive
                                onConfirm={() => handleDelete(row)}
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
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}

export function NewAppointmentButton({
  patients,
  therapists,
  defaultDate,
}: {
  patients: PatientOption[];
  therapists: TherapistOption[];
  defaultDate: string;
}) {
  return (
    <AppointmentFormDialog
      patients={patients}
      therapists={therapists}
      defaultDate={defaultDate}
      trigger={
        <Button>
          <CalendarPlus />
          Nouveau rendez-vous
        </Button>
      }
    />
  );
}

import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Percent,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { requirePermission, userHasPermission } from "@/lib/dal";
import { formatLongDate, formatTime } from "@/lib/format";
import { loadPatientOptions, loadTherapistOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import {
  addDays,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  dayKey,
  startOfWeek,
} from "@/lib/validations/appointment";
import { sessionTypeLabel } from "@/lib/validations/session";

import {
  AppointmentsView,
  NewAppointmentButton,
  type AppointmentDay,
} from "./appointments-table";

export const metadata = { title: "Rendez-vous" };

export default async function AppointmentsPage({
  searchParams,
}: PageProps<"/rendez-vous">) {
  const user = await requirePermission("appointments.view");
  const canManage = userHasPermission(user, "appointments.manage");

  const params = await searchParams;
  const status = typeof params.statut === "string" ? params.statut : "all";
  const therapistFilter =
    typeof params.therapeute === "string" ? params.therapeute : "all";

  const today = new Date();
  const requested = typeof params.debut === "string" ? params.debut : "";
  const parsedStart = /^\d{4}-\d{2}-\d{2}$/.test(requested)
    ? new Date(
        Number(requested.slice(0, 4)),
        Number(requested.slice(5, 7)) - 1,
        Number(requested.slice(8, 10)),
      )
    : today;
  const weekStart = startOfWeek(parsedStart);
  const weekEnd = addDays(weekStart, 7);
  const todayDateKey = dayKey(today);

  const [appointments, patients, therapists] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
        startsAt: { gte: weekStart, lt: weekEnd },
        ...(status !== "all" &&
        (APPOINTMENT_STATUSES as readonly string[]).includes(status)
          ? { status }
          : {}),
        ...(therapistFilter !== "all" && Number.isInteger(Number(therapistFilter))
          ? { therapistId: Number(therapistFilter) }
          : {}),
      },
      orderBy: { startsAt: "asc" },
      include: {
        patient: {
          select: { firstName: true, lastName: true, fileNumber: true },
        },
        therapist: { select: { firstName: true, lastName: true } },
      },
    }),
    canManage ? loadPatientOptions() : Promise.resolve([]),
    loadTherapistOptions(),
  ]);

  const rows = appointments.map((appointment) => ({
    id: appointment.id,
    patientId: appointment.patientId,
    therapistId: appointment.therapistId,
    date: dayKey(appointment.startsAt),
    startTime: formatTime(appointment.startsAt),
    duration: Math.round(
      (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60_000,
    ),
    sessionType: appointment.sessionType ?? "kinesitherapie",
    status: appointment.status,
    notes: appointment.notes ?? "",
    patientName: `${appointment.patient.lastName.toUpperCase()} ${appointment.patient.firstName}`,
    patientFile: appointment.patient.fileNumber,
    therapistName: appointment.therapist
      ? `${appointment.therapist.firstName} ${appointment.therapist.lastName}`
      : null,
    sessionTypeLabel: sessionTypeLabel(appointment.sessionType),
    timeLabel: formatTime(appointment.startsAt),
    endTimeLabel: formatTime(appointment.endsAt),
  }));

  const days: AppointmentDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = dayKey(date);
    return {
      dayKey: key,
      dayLabel: formatLongDate(date),
      isToday: key === todayDateKey,
      rows: rows.filter((row) => row.date === key),
    };
  });

  const count = (value: string) =>
    rows.filter((row) => row.status === value).length;
  const completed = count("completed");
  const cancelled = count("cancelled") + count("no_show");
  const attendance = rows.length
    ? Math.round((completed / rows.length) * 100)
    : 0;

  const previousWeek = dayKey(addDays(weekStart, -7));
  const nextWeek = dayKey(addDays(weekStart, 7));
  const currentWeek = dayKey(startOfWeek(today));
  const weekLabel = `${formatLongDate(weekStart)} → ${formatLongDate(addDays(weekStart, 6))}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendez-vous"
        description={weekLabel}
        actions={
          canManage && patients.length > 0 ? (
            <NewAppointmentButton
              patients={patients}
              therapists={therapists}
              defaultDate={todayDateKey}
            />
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cette semaine"
          value={rows.length}
          hint="rendez-vous planifiés"
          icon={CalendarClock}
          tone="primary"
        />
        <StatCard
          label="Terminés"
          value={completed}
          hint="séances réalisées"
          icon={CalendarCheck}
          tone="success"
        />
        <StatCard
          label="Annulés / absents"
          value={cancelled}
          hint="à reprogrammer si besoin"
          icon={CalendarX}
          tone="danger"
        />
        <StatCard
          label="Taux de présence"
          value={`${attendance}%`}
          hint="séances terminées sur la semaine"
          icon={Percent}
          tone="info"
        />
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Semaine précédente">
            <Link href={buildHref({ debut: previousWeek, statut: status, therapeute: therapistFilter })}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref({ debut: currentWeek, statut: status, therapeute: therapistFilter })}>
              Cette semaine
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="Semaine suivante">
            <Link href={buildHref({ debut: nextWeek, statut: status, therapeute: therapistFilter })}>
              <ChevronRight />
            </Link>
          </Button>
        </div>

        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="debut" value={dayKey(weekStart)} />
          <Select name="statut" defaultValue={status}>
            <SelectTrigger className="w-44">
              <SlidersHorizontal className="size-4 opacity-60" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {APPOINTMENT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {APPOINTMENT_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="therapeute" defaultValue={therapistFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Thérapeute" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les thérapeutes</SelectItem>
              {therapists.map((therapist) => (
                <SelectItem key={therapist.id} value={String(therapist.id)}>
                  {therapist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
        </form>
      </Card>

      <AppointmentsView
        days={days}
        patients={patients}
        therapists={therapists}
        todayKey={todayDateKey}
        canManage={canManage}
      />
    </div>
  );
}

function buildHref(params: {
  debut?: string;
  statut?: string;
  therapeute?: string;
}): string {
  const search = new URLSearchParams();
  if (params.debut) search.set("debut", params.debut);
  if (params.statut && params.statut !== "all") search.set("statut", params.statut);
  if (params.therapeute && params.therapeute !== "all")
    search.set("therapeute", params.therapeute);
  const query = search.toString();
  return query ? `/rendez-vous?${query}` : "/rendez-vous";
}

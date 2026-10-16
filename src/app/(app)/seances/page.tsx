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
import { formatDate } from "@/lib/format";
import { loadPatientOptions, loadTherapistOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/validations/appointment";
import {
  SESSION_STATUSES,
  SESSION_STATUS_LABELS,
  sessionTypeLabel,
} from "@/lib/validations/session";

import {
  NewSessionButton,
  SessionsTable,
  type SessionRow,
} from "./sessions-table";

export const metadata = { title: "Séances" };

function parseDate(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  );
}

export default async function SessionsPage({
  searchParams,
}: PageProps<"/seances">) {
  const user = await requirePermission("sessions.view");
  const canManage = userHasPermission(user, "sessions.manage");

  const params = await searchParams;
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = parseDate(params.du, monthStart);
  const to = parseDate(params.au, today);
  const toExclusive = new Date(
    to.getFullYear(),
    to.getMonth(),
    to.getDate() + 1,
  );
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.statut === "string" ? params.statut : "all";
  const therapistFilter =
    typeof params.therapeute === "string" ? params.therapeute : "all";

  const [sessions, patients, therapists, exercises] = await Promise.all([
    prisma.session.findMany({
      where: {
        deletedAt: null,
        sessionDate: { gte: from, lt: toExclusive },
        ...(status !== "all" &&
        (SESSION_STATUSES as readonly string[]).includes(status)
          ? { status }
          : {}),
        ...(therapistFilter !== "all" &&
        Number.isInteger(Number(therapistFilter))
          ? { therapistId: Number(therapistFilter) }
          : {}),
        ...(query
          ? {
              patient: {
                OR: [
                  { firstName: { contains: query, mode: "insensitive" as const } },
                  { lastName: { contains: query, mode: "insensitive" as const } },
                  { fileNumber: { contains: query, mode: "insensitive" as const } },
                ],
              },
            }
          : {}),
      },
      orderBy: [{ sessionDate: "desc" }, { id: "desc" }],
      take: 200,
      include: {
        patient: {
          select: { firstName: true, lastName: true, fileNumber: true },
        },
        therapist: { select: { firstName: true, lastName: true } },
        progress: { orderBy: { id: "asc" }, take: 1 },
        exercises: {
          select: { exerciseId: true, repetitions: true, sets: true },
        },
      },
    }),
    canManage ? loadPatientOptions() : Promise.resolve([]),
    loadTherapistOptions(),
    prisma.exercise.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: SessionRow[] = sessions.map((session) => {
    const progress = session.progress[0];
    return {
      id: session.id,
      patientId: session.patientId,
      therapistId: session.therapistId,
      date: dayKey(session.sessionDate),
      startTime: session.startTime ?? "",
      duration: session.duration,
      sessionType: session.sessionType ?? "kinesitherapie",
      status: session.status,
      reason: session.reason ?? "",
      treatmentDone: session.treatmentDone ?? "",
      manualTherapy: session.manualTherapy ?? "",
      electrotherapy: session.electrotherapy ?? "",
      thermotherapy: session.thermotherapy ?? "",
      homeExercises: session.homeExercises ?? "",
      observations: session.observations ?? "",
      painEvolution: progress?.painEvolution ?? "",
      mobilityEvolution: progress?.mobilityEvolution ?? "",
      strengthEvolution: progress?.strengthEvolution ?? "",
      functionalEvolution: progress?.functionalEvolution ?? "",
      progress: progress?.progress ?? "",
      difficulties: progress?.difficulties ?? "",
      recommendations: progress?.recommendations ?? "",
      exercises: session.exercises.map((item) => ({
        exerciseId: item.exerciseId,
        repetitions: item.repetitions,
        sets: item.sets,
      })),
      patientName: `${session.patient.lastName.toUpperCase()} ${session.patient.firstName}`,
      patientFile: session.patient.fileNumber,
      therapistName: session.therapist
        ? `${session.therapist.firstName} ${session.therapist.lastName}`
        : null,
      dateLabel: formatDate(session.sessionDate),
      sessionTypeLabel: sessionTypeLabel(session.sessionType),
    };
  });

  const totalMinutes = sessions.reduce(
    (sum, session) => sum + (session.duration ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Séances"
        description={`${sessions.length} séance${sessions.length > 1 ? "s" : ""} · ${Math.round(totalMinutes / 60)} h enregistrées sur la période`}
        actions={
          <>
            <RefreshButton />
            {canManage && patients.length > 0 ? (
              <NewSessionButton
                patients={patients}
                therapists={therapists}
                exercises={exercises}
                defaultDate={dayKey(today)}
              />
            ) : null}
          </>
        }
      />

      <Card className="p-4">
        <form
          method="get"
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Rechercher un patient, un dossier…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              name="du"
              type="date"
              aria-label="Du"
              defaultValue={dayKey(from)}
              className="w-40"
            />
            <Input
              name="au"
              type="date"
              aria-label="Au"
              defaultValue={dayKey(to)}
              className="w-40"
            />
            <Select name="statut" defaultValue={status}>
              <SelectTrigger className="w-40">
                <SlidersHorizontal className="size-4 opacity-60" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {SESSION_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SESSION_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="therapeute" defaultValue={therapistFilter}>
              <SelectTrigger className="w-44">
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
          </div>
        </form>
      </Card>

      <SessionsTable
        sessions={rows}
        patients={patients}
        therapists={therapists}
        exercises={exercises}
        canManage={canManage}
      />

      {sessions.length >= 200 ? (
        <p className="text-sm text-muted-foreground">
          Seules les 200 séances les plus récentes sont affichées. Affinez la
          période pour voir les suivantes.
        </p>
      ) : null}
    </div>
  );
}

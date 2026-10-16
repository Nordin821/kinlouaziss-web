import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Database,
  FileText,
  ReceiptText,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { StatCard } from "@/components/ui/stat-card";
import { ROUTES, patientPath } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const user = await requireUser();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalPatients,
    newThisMonth,
    todayAppointments,
    upcomingAppointments,
    recentPatients,
    monthRevenue,
    unpaidAggregate,
  ] = await Promise.all([
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.patient.count({
      where: { deletedAt: null, registeredAt: { gte: startOfMonth } },
    }),
    prisma.appointment.count({
      where: {
        deletedAt: null,
        startsAt: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
        startsAt: { gte: now },
        status: { in: ["planned", "confirmed"] },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
      include: { patient: true, therapist: true },
    }),
    prisma.patient.findMany({
      where: { deletedAt: null },
      orderBy: { registeredAt: "desc" },
      take: 5,
    }),
    prisma.payment.aggregate({
      where: { deletedAt: null, paymentDate: { gte: startOfMonth } },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { deletedAt: null, status: { in: ["unpaid", "partial"] } },
      _sum: { remainingAmount: true },
      _count: true,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour, ${user.fullName.split(" ")[0]}`}
        description="Vue d'ensemble de l'activité du cabinet."
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <RefreshButton />
            {userHasPermission(user, "records.view") ? (
              <Button asChild variant="outline">
                <Link href={ROUTES.medicalRecords}>
                  <FileText />
                  Dossiers médicaux
                </Link>
              </Button>
            ) : null}
            {userHasPermission(user, "backup.manage") ? (
              <Button asChild variant="outline">
                <Link href={ROUTES.backup}>
                  <Database />
                  Sauvegarde
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={ROUTES.appointments}>
                <CalendarClock />
                Voir l&apos;agenda
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Patients"
          value={totalPatients}
          hint={`+${newThisMonth} ce mois-ci`}
          icon={Users}
        />
        <StatCard
          label="Rendez-vous aujourd'hui"
          value={todayAppointments}
          hint="Créneaux planifiés"
          icon={CalendarClock}
          tone="info"
        />
        <StatCard
          label="Encaissé ce mois"
          value={formatCurrency(monthRevenue._sum.paidAmount ?? 0)}
          hint="Paiements reçus"
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Impayés"
          value={formatCurrency(unpaidAggregate._sum.remainingAmount ?? 0)}
          hint={`${unpaidAggregate._count} facture(s) en attente`}
          icon={ReceiptText}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Prochains rendez-vous</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.appointments}>
                Tout voir
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Aucun rendez-vous à venir"
                description="Les prochains rendez-vous planifiés apparaîtront ici."
              />
            ) : (
              upcomingAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={patientPath(appointment.patientId)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-primary-soft px-2 py-1 text-primary-soft-foreground">
                    <span className="text-sm font-semibold">
                      {formatTime(appointment.startsAt)}
                    </span>
                    <span className="text-[10px] uppercase">
                      {formatDate(appointment.startsAt).slice(0, 5)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {appointment.patient.lastName.toUpperCase()}{" "}
                      {appointment.patient.firstName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDateTime(appointment.startsAt)}
                      {appointment.therapist
                        ? ` · Dr ${appointment.therapist.lastName}`
                        : ""}
                    </span>
                  </span>
                  <StatusBadge status={appointment.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Derniers patients</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.patients}>
                <UserPlus />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentPatients.length === 0 ? (
              <EmptyState icon={Users} title="Aucun patient" />
            ) : (
              recentPatients.map((patient) => (
                <Link
                  key={patient.id}
                  href={patientPath(patient.id)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Avatar
                    name={`${patient.firstName} ${patient.lastName}`}
                    className="size-8"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {patient.lastName.toUpperCase()} {patient.firstName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDate(patient.registeredAt)}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

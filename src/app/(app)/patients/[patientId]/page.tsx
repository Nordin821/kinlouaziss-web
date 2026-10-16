import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChartLine,
  FileText,
  Pencil,
  Phone,
  Receipt,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/print-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/dal";
import {
  calculateAge,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { GENDER_LABELS, type GENDERS } from "@/lib/validations/patient";

import { PatientFormDialog } from "../patient-form-dialog";

import { PatientRecordActions } from "./patient-record-actions";

export default async function PatientDetailsPage({
  params,
}: PageProps<"/patients/[patientId]">) {
  await requireUser();

  const { patientId } = await params;
  const id = Number(patientId);
  if (!Number.isInteger(id)) notFound();

  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    include: {
      medicalRecord: true,
      medicalHistory: true,
      appointments: {
        where: { deletedAt: null },
        orderBy: { startsAt: "desc" },
        take: 5,
        include: { therapist: true },
      },
      sessions: {
        where: { deletedAt: null },
        orderBy: { sessionDate: "desc" },
        take: 5,
      },
      payments: {
        where: { deletedAt: null },
        orderBy: { paymentDate: "desc" },
        take: 5,
      },
      _count: {
        select: { appointments: true, sessions: true, invoices: true, documents: true },
      },
    },
  });

  if (!patient) notFound();

  const fullName = `${patient.lastName.toUpperCase()} ${patient.firstName}`;
  const age = calculateAge(patient.birthDate);

  const infoRows: Array<{ label: string; value: string }> = [
    { label: "Numéro de dossier", value: patient.fileNumber },
    {
      label: "Sexe",
      value:
        GENDER_LABELS[patient.gender as (typeof GENDERS)[number]] ??
        "Non précisé",
    },
    { label: "Date de naissance", value: formatDate(patient.birthDate) },
    { label: "Âge", value: age !== null ? `${age} ans` : "—" },
    { label: "Téléphone", value: patient.phone ?? "—" },
    { label: "E-mail", value: patient.email ?? "—" },
    { label: "Ville", value: patient.city ?? "—" },
    { label: "Profession", value: patient.occupation ?? "—" },
    { label: "Médecin traitant", value: patient.referringDoctor ?? "—" },
    { label: "Inscrit le", value: formatDate(patient.registeredAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.patients}>
            <ArrowLeft />
            Retour aux patients
          </Link>
        </Button>
      </div>

      <PageHeader
        title={fullName}
        description={`Dossier ${patient.fileNumber}`}
        actions={
          <div className="no-print flex items-center gap-2">
            <RefreshButton />
            <Button asChild variant="outline">
              <Link href={`${ROUTES.patients}/${patient.id}/rapport`}>
                <ChartLine />
                Rapport d&apos;évolution
              </Link>
            </Button>
            <PrintButton label="Imprimer la fiche" />
            <StatusBadge status={patient.status} />
            <PatientFormDialog
              patient={{
                id: patient.id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                gender: patient.gender,
                birthDate: patient.birthDate
                  ? patient.birthDate.toISOString()
                  : null,
                phone: patient.phone,
                email: patient.email,
                address: patient.address,
                city: patient.city,
                occupation: patient.occupation,
                referringDoctor: patient.referringDoctor,
                referringDoctorPhone: patient.referringDoctorPhone,
                status: patient.status,
                notes: patient.notes,
              }}
              trigger={
                <Button variant="outline">
                  <Pencil />
                  Modifier
                </Button>
              }
            />
            <PatientRecordActions
              patientId={patient.id}
              status={patient.status}
              patientName={fullName}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <Avatar name={fullName} className="size-12" />
              <div>
                <CardTitle>Informations administratives</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Coordonnées et données d&apos;identification
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {infoRows.map((row) => (
                  <div key={row.label} className="space-y-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="text-sm">{row.value}</dd>
                  </div>
                ))}
              </dl>
              {patient.address ? (
                <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  <Phone className="mt-0.5 size-4" />
                  <span>{patient.address}</span>
                </div>
              ) : null}
              {patient.notes ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">
                    {patient.notes}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <SectionCard
            title="Dossier médical"
            icon={FileText}
            empty="Dossier médical non encore renseigné."
            isEmpty={
              !patient.medicalRecord?.chiefComplaint &&
              !patient.medicalRecord?.diagnosis &&
              !patient.medicalRecord?.notes
            }
          >
            <dl className="space-y-4">
              <InfoBlock
                label="Motif principal"
                value={patient.medicalRecord?.chiefComplaint}
              />
              <InfoBlock
                label="Diagnostic"
                value={patient.medicalRecord?.diagnosis}
              />
              <InfoBlock label="Notes" value={patient.medicalRecord?.notes} />
            </dl>
          </SectionCard>

          <SectionCard
            title="Antécédents médicaux"
            icon={Stethoscope}
            empty="Aucun antécédent enregistré."
            isEmpty={
              !patient.medicalHistory?.pastMedicalHistory &&
              !patient.medicalHistory?.allergies &&
              !patient.medicalHistory?.medications
            }
          >
            <dl className="space-y-4">
              <InfoBlock
                label="Antécédents médicaux"
                value={patient.medicalHistory?.pastMedicalHistory}
              />
              <InfoBlock
                label="Antécédents chirurgicaux"
                value={patient.medicalHistory?.surgicalHistory}
              />
              <InfoBlock
                label="Maladies chroniques"
                value={patient.medicalHistory?.chronicDiseases}
              />
              <InfoBlock
                label="Médicaments"
                value={patient.medicalHistory?.medications}
              />
              <InfoBlock
                label="Allergies"
                value={patient.medicalHistory?.allergies}
              />
            </dl>
          </SectionCard>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <MiniStat
                label="Rendez-vous"
                value={patient._count.appointments}
              />
              <MiniStat label="Séances" value={patient._count.sessions} />
              <MiniStat label="Factures" value={patient._count.invoices} />
              <MiniStat label="Documents" value={patient._count.documents} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Derniers rendez-vous</CardTitle>
              <CalendarDays className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {patient.appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun rendez-vous.
                </p>
              ) : (
                patient.appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {formatDateTime(appointment.startsAt)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.therapist
                          ? `Dr ${appointment.therapist.lastName}`
                          : "Thérapeute non assigné"}
                      </p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Derniers paiements</CardTitle>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {patient.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun paiement.
                </p>
              ) : (
                patient.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {formatDate(payment.paymentDate)}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(payment.paidAmount || payment.amount)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Receipt className="size-4 text-muted-foreground" />
          <CardTitle>Dernières séances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patient.sessions.length === 0 ? (
                <TableEmpty colSpan={4}>Aucune séance enregistrée.</TableEmpty>
              ) : (
                patient.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatDate(session.sessionDate)}</TableCell>
                    <TableCell>{session.sessionType ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {session.reason ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={session.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  empty,
  isEmpty,
  children,
}: {
  title: string;
  icon: LucideIcon;
  empty: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? <EmptyState icon={Icon} title={empty} /> : children}
      </CardContent>
    </Card>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="whitespace-pre-line text-sm">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

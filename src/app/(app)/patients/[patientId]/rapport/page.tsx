import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChartLine } from "lucide-react";

import { DocumentHeader } from "@/components/document-header";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { patientPath, ROUTES } from "@/lib/constants";
import { requirePermission } from "@/lib/dal";
import { calculateAge, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { sessionTypeLabel } from "@/lib/validations/session";

export const metadata = { title: "Rapport d'évolution" };

export default async function PatientEvolutionReportPage({
  params,
}: PageProps<"/patients/[patientId]/rapport">) {
  await requirePermission("sessions.view");

  const { patientId } = await params;
  const id = Number(patientId);
  if (!Number.isInteger(id)) notFound();

  const [patient, settings] = await Promise.all([
    prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        sessions: {
          where: { deletedAt: null },
          orderBy: [{ sessionDate: "desc" }, { id: "desc" }],
          include: {
            therapist: true,
            progress: { orderBy: { id: "asc" }, take: 1 },
          },
        },
      },
    }),
    loadSettings(),
  ]);

  if (!patient) notFound();

  const age = calculateAge(patient.birthDate);
  const fullName = `${patient.lastName.toUpperCase()} ${patient.firstName}`;
  const completed = patient.sessions.filter((s) => s.status === "completed").length;
  const cancelled = patient.sessions.filter((s) => s.status === "cancelled").length;
  const totalMinutes = patient.sessions.reduce(
    (sum, session) => sum + (session.duration ?? 0),
    0,
  );
  const oldest = patient.sessions.at(-1);
  const newest = patient.sessions[0];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={patientPath(patient.id)}>
            <ArrowLeft />
            Retour à la fiche patient
          </Link>
        </Button>
        <PrintButton label="Imprimer le rapport" />
      </div>

      <article className="print-document space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <DocumentHeader
          settings={settings}
          title="Rapport d'évolution"
          subtitle={`Dossier ${patient.fileNumber}`}
        />

        <section className="grid gap-4 sm:grid-cols-2 print-break">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Patient
            </p>
            <p className="font-medium">{fullName}</p>
            <p className="text-sm text-muted-foreground">
              Dossier {patient.fileNumber}
              {age !== null ? ` · ${age} ans` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {patient.phone ?? "—"}
            </p>
          </div>
          <div className="space-y-1 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Période couverte
            </p>
            <p className="font-medium">
              {oldest && newest
                ? `${formatDate(oldest.sessionDate)} → ${formatDate(newest.sessionDate)}`
                : "Aucune séance"}
            </p>
            <p className="text-sm text-muted-foreground">
              {patient.sessions.length} séance
              {patient.sessions.length > 1 ? "s" : ""} · {completed} terminée
              {completed > 1 ? "s" : ""}
              {cancelled > 0 ? ` · ${cancelled} annulée${cancelled > 1 ? "s" : ""}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Durée cumulée : {Math.floor(totalMinutes / 60)} h{" "}
              {totalMinutes % 60} min
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historique des séances
          </h2>
          {patient.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune séance enregistrée pour ce patient.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-1.5 pr-3 font-medium">Date</th>
                    <th className="py-1.5 pr-3 font-medium">Thérapeute</th>
                    <th className="py-1.5 pr-3 font-medium">Type</th>
                    <th className="py-1.5 pr-3 font-medium">Durée</th>
                    <th className="py-1.5 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.sessions.map((session) => (
                    <tr key={session.id} className="border-b border-border/60">
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {formatDate(session.sessionDate)}
                      </td>
                      <td className="py-1.5 pr-3">
                        {session.therapist
                          ? `${session.therapist.firstName} ${session.therapist.lastName}`
                          : "Non assigné"}
                      </td>
                      <td className="py-1.5 pr-3">
                        {sessionTypeLabel(session.sessionType)}
                      </td>
                      <td className="py-1.5 pr-3">
                        {session.duration ? `${session.duration} min` : "—"}
                      </td>
                      <td className="py-1.5">
                        <StatusBadge status={session.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Évolution détaillée
          </h2>
          {patient.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              L&apos;évolution détaillée apparaîtra dès la première séance saisie.
            </p>
          ) : (
            patient.sessions.map((session) => {
              const progress = session.progress[0];
              if (
                !progress &&
                !session.reason &&
                !session.treatmentDone &&
                !session.observations
              ) {
                return null;
              }

              return (
                <section
                  key={session.id}
                  className="print-break rounded-lg border border-border p-4"
                >
                  <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {formatDate(session.sessionDate)}
                      {session.therapist
                        ? ` · ${session.therapist.firstName} ${session.therapist.lastName}`
                        : ""}
                    </p>
                    <StatusBadge status={session.status} />
                  </header>
                  <dl className="space-y-2">
                    <Field label="Motif / plainte" value={session.reason} />
                    <Field label="Traitement réalisé" value={session.treatmentDone} />
                    <Field label="Douleur" value={progress?.painEvolution} />
                    <Field label="Mobilité" value={progress?.mobilityEvolution} />
                    <Field label="Force musculaire" value={progress?.strengthEvolution} />
                    <Field
                      label="Fonctionnel"
                      value={progress?.functionalEvolution}
                    />
                    <Field label="Progression" value={progress?.progress} />
                    <Field label="Difficultés" value={progress?.difficulties} />
                    <Field
                      label="Recommandations"
                      value={progress?.recommendations}
                    />
                    <Field label="Observations" value={session.observations} />
                  </dl>
                </section>
              );
            })
          )}
        </section>

        {settings.invoiceFooterNote ? (
          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            {settings.invoiceFooterNote}
          </p>
        ) : null}

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ChartLine className="size-3.5" />
          Document généré le {formatDate(new Date())} ·{" "}
          <Link
            href={`${ROUTES.medicalRecords}`}
            className="text-primary underline-offset-2 hover:underline"
          >
            Dossiers médicaux
          </Link>
        </p>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line text-sm">{value}</dd>
    </div>
  );
}

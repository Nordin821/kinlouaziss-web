import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DocumentHeader } from "@/components/document-header";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { patientPath } from "@/lib/constants";
import { requirePermission } from "@/lib/dal";
import { calculateAge, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { sessionTypeLabel } from "@/lib/validations/session";

export const metadata = { title: "Compte rendu de séance" };

export default async function SessionDetailPage({
  params,
}: PageProps<"/seances/[sessionId]">) {
  await requirePermission("sessions.view");

  const { sessionId } = await params;
  const id = Number(sessionId);
  if (!Number.isInteger(id)) notFound();

  const [session, settings] = await Promise.all([
    prisma.session.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: true,
        therapist: true,
        progress: { orderBy: { id: "asc" }, take: 1 },
        exercises: { include: { exercise: { select: { name: true } } } },
      },
    }),
    loadSettings(),
  ]);

  if (!session) notFound();

  const progress = session.progress[0];
  const age = calculateAge(session.patient.birthDate);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/seances">
            <ArrowLeft />
            Retour aux séances
          </Link>
        </Button>
        <PrintButton label="Imprimer le compte rendu" />
      </div>

      <article className="print-document space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <DocumentHeader
          settings={settings}
          title="Compte rendu de séance"
          subtitle={`Séance n° ${session.id}`}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Patient
            </p>
            <p className="font-medium">
              {session.patient.lastName.toUpperCase()} {session.patient.firstName}
            </p>
            <p className="text-sm text-muted-foreground">
              Dossier {session.patient.fileNumber}
              {age !== null ? ` · ${age} ans` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {session.patient.phone ?? "—"}
            </p>
          </div>
          <div className="space-y-1 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Séance
            </p>
            <p className="font-medium">{formatDate(session.sessionDate)}</p>
            <p className="text-sm text-muted-foreground">
              {session.startTime ?? "—"}
              {session.duration ? ` · ${session.duration} min` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {sessionTypeLabel(session.sessionType)}
            </p>
            <p className="pt-1">
              <StatusBadge status={session.status} />
            </p>
          </div>
        </div>

        <section className="print-break space-y-2">
          <Heading>Thérapeute</Heading>
          <p className="text-sm">
            {session.therapist
              ? `${session.therapist.firstName} ${session.therapist.lastName}`
              : "Non assigné"}
          </p>
        </section>

        <section className="print-break space-y-3">
          <Heading>Traitement</Heading>
          <Field label="Motif / plainte" value={session.reason} />
          <Field label="Traitement réalisé" value={session.treatmentDone} />
          <Field label="Thérapie manuelle" value={session.manualTherapy} />
          <Field label="Électrothérapie" value={session.electrotherapy} />
          <Field label="Thermothérapie" value={session.thermotherapy} />
        </section>

        <section className="print-break space-y-3">
          <Heading>Évolution</Heading>
          <Field label="Douleur" value={progress?.painEvolution ?? null} />
          <Field label="Mobilité" value={progress?.mobilityEvolution ?? null} />
          <Field label="Force musculaire" value={progress?.strengthEvolution ?? null} />
          <Field
            label="Fonctionnel"
            value={progress?.functionalEvolution ?? null}
          />
          <Field label="Progression" value={progress?.progress ?? null} />
          <Field label="Difficultés" value={progress?.difficulties ?? null} />
          <Field
            label="Recommandations"
            value={progress?.recommendations ?? null}
          />
        </section>

        <section className="print-break space-y-2">
          <Heading>Exercices réalisés</Heading>
          {session.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun exercice enregistré.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {session.exercises.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>{item.exercise.name}</span>
                  <span className="text-muted-foreground">
                    {[
                      item.sets ? `${item.sets} séries` : null,
                      item.repetitions ? `${item.repetitions} rép.` : null,
                    ]
                      .filter(Boolean)
                      .join(" × ") || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="print-break space-y-3">
          <Heading>Consignes</Heading>
          <Field label="Exercices à domicile" value={session.homeExercises} />
          <Field label="Observations" value={session.observations} />
        </section>

        {settings.invoiceFooterNote ? (
          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            {settings.invoiceFooterNote}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Document consultable dans le dossier patient{" "}
          <Link
            href={patientPath(session.patientId)}
            className="text-primary underline-offset-2 hover:underline"
          >
            {session.patient.fileNumber}
          </Link>
          .
        </p>
      </article>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr]">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-line text-sm">{value ?? "—"}</p>
    </div>
  );
}

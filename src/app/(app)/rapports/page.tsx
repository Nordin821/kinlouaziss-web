import {
  BadgeDollarSign,
  CalendarCheck,
  Download,
  FileText,
  Repeat,
  UserPlus,
  Wallet,
} from "lucide-react";

import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/format";
import { loadReport, resolveRange } from "@/lib/reports";

export const metadata = { title: "Rapports" };

export default async function ReportsPage({
  searchParams,
}: PageProps<"/rapports">) {
  await requirePermission("reports.view");

  const params = await searchParams;
  const du = typeof params.du === "string" ? params.du : undefined;
  const au = typeof params.au === "string" ? params.au : undefined;

  const range = resolveRange(du, au);
  const report = await loadReport(range);
  const { totals } = report;

  const exportHref = `/rapports/export?du=${range.fromInput}&au=${range.toInput}`;
  const maxSessions = Math.max(
    1,
    ...report.byMonth.map((month) => month.sessions),
  );
  const maxCollected = Math.max(
    1,
    ...report.byMonth.map((month) => month.collected),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        description={`Activité du ${formatDate(range.from)} au ${formatDate(range.to)}`}
        actions={
          <>
            <PrintButton label="Imprimer" />
            <Button asChild variant="outline">
              <a href={exportHref} download>
                <Download />
                Exporter CSV
              </a>
            </Button>
          </>
        }
      />

      <Card className="no-print p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Du" htmlFor="du" className="sm:w-48">
            <Input
              id="du"
              name="du"
              type="date"
              defaultValue={range.fromInput}
            />
          </Field>
          <Field label="Au" htmlFor="au" className="sm:w-48">
            <Input
              id="au"
              name="au"
              type="date"
              defaultValue={range.toInput}
            />
          </Field>
          <Button type="submit">Afficher la période</Button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Séances"
          value={totals.sessions}
          hint={`${totals.completedSessions} terminée${totals.completedSessions > 1 ? "s" : ""}`}
          icon={Repeat}
          tone="primary"
        />
        <StatCard
          label="Rendez-vous"
          value={totals.appointments}
          hint="sur la période"
          icon={CalendarCheck}
          tone="info"
        />
        <StatCard
          label="Nouveaux patients"
          value={totals.newPatients}
          hint="dossiers créés"
          icon={UserPlus}
          tone="success"
        />
        <StatCard
          label="Encaissé"
          value={formatCurrency(totals.collected)}
          hint={`Facturé ${formatCurrency(totals.invoiced)}`}
          icon={Wallet}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Restant à encaisser"
          value={formatCurrency(totals.outstanding)}
          hint="solde des factures"
          icon={BadgeDollarSign}
          tone={totals.outstanding > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Devis émis"
          value={formatCurrency(totals.quotesTotal)}
          hint={`${totals.acceptedQuotes} accepté${totals.acceptedQuotes > 1 ? "s" : ""}`}
          icon={FileText}
          tone="info"
        />
        <StatCard
          label="Taux de réalisation"
          value={`${totals.sessions > 0 ? Math.round((totals.completedSessions / totals.sessions) * 100) : 0} %`}
          hint="séances terminées"
          icon={Repeat}
          tone="primary"
        />
      </div>

      <Card className="print-break p-5">
        <h2 className="mb-4 text-base font-semibold">
          Évolution mensuelle
        </h2>
        <div className="space-y-3">
          {report.byMonth.map((month) => (
            <div key={month.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{month.label}</span>
                <span className="text-xs text-muted-foreground">
                  {month.sessions} séance{month.sessions > 1 ? "s" : ""} ·{" "}
                  {formatCurrency(month.collected)}
                </span>
              </div>
              <div className="flex gap-1">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(month.sessions / maxSessions) * 100}%`,
                    }}
                  />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{
                      width: `${(month.collected / maxCollected) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-primary" />
            Séances
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-success" />
            Encaissements
          </span>
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="print-break p-5">
          <h2 className="mb-4 text-base font-semibold">
            Activité par thérapeute
          </h2>
          {report.byTherapist.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune séance sur la période.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thérapeute</TableHead>
                  <TableHead className="text-right">Séances</TableHead>
                  <TableHead className="text-right">Terminées</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byTherapist.map((entry) => (
                  <TableRow key={entry.therapistId ?? "none"}>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.sessions}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.completed}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="print-break p-5">
          <h2 className="mb-4 text-base font-semibold">
            Encaissements par méthode
          </h2>
          {report.byMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun paiement sur la période.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Méthode</TableHead>
                  <TableHead className="text-right">Nombre</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byMethod.map((entry) => (
                  <TableRow key={entry.method}>
                    <TableCell className="font-medium">{entry.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Card className="print-break p-5">
        <h2 className="mb-4 text-base font-semibold">
          Répartition par type de séance
        </h2>
        {report.byType.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune séance sur la période.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.byType.map((entry) => (
              <div
                key={entry.sessionType}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{entry.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {entry.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { loadReport, resolveRange } from "@/lib/reports";

/** Échappe une cellule CSV (guillemets, séparateurs, retours à la ligne). */
function cell(value: string | number): string {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function line(values: (string | number)[]): string {
  return values.map(cell).join(";");
}

/**
 * Export CSV du rapport d'activité.
 *
 * Le séparateur est le point-virgule et l'encodage UTF-8 avec BOM, afin que le
 * fichier s'ouvre correctement dans Excel en locale française.
 */
export async function GET(request: Request): Promise<Response> {
  await requirePermission("reports.view");

  const url = new URL(request.url);
  const range = resolveRange(
    url.searchParams.get("du") ?? undefined,
    url.searchParams.get("au") ?? undefined,
  );
  const report = await loadReport(range);

  const rows: string[] = [];
  rows.push(line(["Rapport d'activité"]));
  rows.push(
    line(["Période", formatDate(range.from), formatDate(range.to)]),
  );
  rows.push("");

  rows.push(line(["Indicateurs"]));
  rows.push(line(["Séances", report.totals.sessions]));
  rows.push(line(["Séances terminées", report.totals.completedSessions]));
  rows.push(line(["Rendez-vous", report.totals.appointments]));
  rows.push(line(["Nouveaux patients", report.totals.newPatients]));
  rows.push(line(["Montant facturé", report.totals.invoiced.toFixed(2)]));
  rows.push(line(["Montant encaissé", report.totals.collected.toFixed(2)]));
  rows.push(
    line(["Restant à encaisser", report.totals.outstanding.toFixed(2)]),
  );
  rows.push(line(["Devis émis", report.totals.quotesTotal.toFixed(2)]));
  rows.push(line(["Devis acceptés", report.totals.acceptedQuotes]));
  rows.push("");

  rows.push(line(["Évolution mensuelle"]));
  rows.push(line(["Mois", "Séances", "Encaissements"]));
  for (const month of report.byMonth) {
    rows.push(
      line([month.label, month.sessions, month.collected.toFixed(2)]),
    );
  }
  rows.push("");

  rows.push(line(["Activité par thérapeute"]));
  rows.push(line(["Thérapeute", "Séances", "Terminées"]));
  for (const entry of report.byTherapist) {
    rows.push(line([entry.name, entry.sessions, entry.completed]));
  }
  rows.push("");

  rows.push(line(["Encaissements par méthode"]));
  rows.push(line(["Méthode", "Nombre", "Montant"]));
  for (const entry of report.byMethod) {
    rows.push(line([entry.label, entry.count, entry.amount.toFixed(2)]));
  }
  rows.push("");

  rows.push(line(["Répartition par type de séance"]));
  rows.push(line(["Type", "Nombre"]));
  for (const entry of report.byType) {
    rows.push(line([entry.label, entry.count]));
  }

  const csv = `\uFEFF${rows.join("\r\n")}\r\n`;
  const fileName = `rapport-${range.fromInput}-${range.toInput}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

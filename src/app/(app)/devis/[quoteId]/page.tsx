import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DocumentHeader } from "@/components/document-header";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ROUTES, patientPath } from "@/lib/constants";
import { requirePermission, userHasPermission } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/format";
import { loadPatientOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { dayKey } from "@/lib/validations/appointment";

import { QuoteActions } from "./quote-actions";

export const metadata = { title: "Devis" };

export default async function QuoteDetailPage({
  params,
}: PageProps<"/devis/[quoteId]">) {
  const user = await requirePermission("quotes.view");
  const canManage = userHasPermission(user, "quotes.manage");
  const canConvert = userHasPermission(user, "invoices.manage");

  const { quoteId } = await params;
  const id = Number(quoteId);
  if (!Number.isInteger(id)) notFound();

  const quote = await prisma.quote.findFirst({
    where: { id, deletedAt: null },
    include: {
      patient: true,
      items: { orderBy: { id: "asc" } },
    },
  });

  if (!quote) notFound();

  const settings = await loadSettings();
  const patients = canManage ? await loadPatientOptions() : [];

  const formData = {
    id: quote.id,
    patientId: quote.patientId,
    issueDate: dayKey(quote.issueDate),
    validUntil: quote.validUntil ? dayKey(quote.validUntil) : "",
    discount: quote.discount,
    vatRate: quote.vatRate,
    notes: quote.notes ?? "",
    status: quote.status,
    items: quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.quotes}>
            <ArrowLeft />
            Retour aux devis
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <PrintButton label="Imprimer" />
          <QuoteActions
            quote={formData}
            patients={patients}
            canManage={canManage}
            canConvert={canConvert}
          />
        </div>
      </div>

      <article className="print-document space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <DocumentHeader
          settings={settings}
          title="Devis"
          subtitle={quote.quoteNumber}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Destinataire
            </p>
            <p className="font-medium">
              {quote.patient.lastName.toUpperCase()} {quote.patient.firstName}
            </p>
            <p className="text-sm text-muted-foreground">
              Dossier {quote.patient.fileNumber}
            </p>
            {quote.patient.phone ? (
              <p className="text-sm text-muted-foreground">
                {quote.patient.phone}
              </p>
            ) : null}
            {quote.patient.address ? (
              <p className="text-sm text-muted-foreground">
                {quote.patient.address}
                {quote.patient.city ? `, ${quote.patient.city}` : ""}
              </p>
            ) : null}
          </div>
          <div className="space-y-1 sm:text-right">
            <div className="flex items-center gap-2 sm:justify-end">
              <StatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Émis le {formatDate(quote.issueDate)}
            </p>
            {quote.validUntil ? (
              <p className="text-sm text-muted-foreground">
                Valable jusqu&apos;au {formatDate(quote.validUntil)}
              </p>
            ) : null}
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </th>
              <th className="py-2 pr-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Qté
              </th>
              <th className="py-2 pr-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prix unitaire
              </th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.id} className="border-b border-border/60">
                <td className="py-2 pr-2">{item.description}</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatCurrency(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <dl className="w-full max-w-xs space-y-1 text-sm">
            <TotalRow
              label="Sous-total"
              value={formatCurrency(quote.subtotal)}
            />
            {quote.discount > 0 ? (
              <TotalRow
                label="Remise"
                value={`− ${formatCurrency(quote.discount)}`}
              />
            ) : null}
            {quote.vatRate > 0 ? (
              <TotalRow
                label={`TVA (${quote.vatRate} %)`}
                value={formatCurrency(quote.vatAmount)}
              />
            ) : null}
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCurrency(quote.total)}</dd>
            </div>
          </dl>
        </div>

        {quote.notes ? (
          <section className="print-break space-y-1">
            <h2 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h2>
            <p className="whitespace-pre-line text-sm">{quote.notes}</p>
          </section>
        ) : null}

        {settings.invoiceFooterNote ? (
          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            {settings.invoiceFooterNote}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Dossier patient :{" "}
          <Link
            href={patientPath(quote.patientId)}
            className="text-primary underline-offset-2 hover:underline"
          >
            {quote.patient.fileNumber}
          </Link>
        </p>
      </article>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

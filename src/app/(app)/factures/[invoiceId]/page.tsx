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
import {
  loadInvoiceOptions,
  loadPatientOptions,
  loadSessionOptions,
} from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { dayKey } from "@/lib/validations/appointment";
import { PAYMENT_METHOD_LABELS } from "@/lib/validations/payment";

import { InvoiceActions } from "./invoice-actions";

export const metadata = { title: "Facture" };

export default async function InvoiceDetailPage({
  params,
}: PageProps<"/factures/[invoiceId]">) {
  const user = await requirePermission("invoices.view");
  const canManage = userHasPermission(user, "invoices.manage");

  const { invoiceId } = await params;
  const id = Number(invoiceId);
  if (!Number.isInteger(id)) notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { id, deletedAt: null },
    include: {
      patient: true,
      items: { orderBy: { id: "asc" } },
      payments: { where: { deletedAt: null }, orderBy: { paymentDate: "asc" } },
    },
  });

  if (!invoice) notFound();

  const settings = await loadSettings();
  const [patients, sessions, invoiceOptions] = canManage
    ? await Promise.all([
        loadPatientOptions(),
        loadSessionOptions(),
        loadInvoiceOptions(),
      ])
    : [[], [], []];

  const formData = {
    id: invoice.id,
    patientId: invoice.patientId,
    issueDate: dayKey(invoice.issueDate),
    dueDate: invoice.dueDate ? dayKey(invoice.dueDate) : "",
    discount: invoice.discount,
    vatRate: invoice.vatRate,
    notes: invoice.notes ?? "",
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    remainingAmount: invoice.remainingAmount,
  };

  const today = dayKey(new Date());

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.invoices}>
            <ArrowLeft />
            Retour aux factures
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <PrintButton label="Imprimer" />
          <InvoiceActions
            invoice={formData}
            patients={patients}
            invoiceOptions={invoiceOptions}
            sessions={sessions}
            defaultAmount={invoice.remainingAmount.toFixed(2)}
            defaultDate={today}
            canManage={canManage}
          />
        </div>
      </div>

      <article className="print-document space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <DocumentHeader
          settings={settings}
          title="Facture"
          subtitle={invoice.invoiceNumber}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Facturé à
            </p>
            <p className="font-medium">
              {invoice.patient.lastName.toUpperCase()} {invoice.patient.firstName}
            </p>
            <p className="text-sm text-muted-foreground">
              Dossier {invoice.patient.fileNumber}
            </p>
            {invoice.patient.phone ? (
              <p className="text-sm text-muted-foreground">
                {invoice.patient.phone}
              </p>
            ) : null}
            {invoice.patient.address ? (
              <p className="text-sm text-muted-foreground">
                {invoice.patient.address}
                {invoice.patient.city ? `, ${invoice.patient.city}` : ""}
              </p>
            ) : null}
          </div>
          <div className="space-y-1 sm:text-right">
            <div className="flex items-center gap-2 sm:justify-end">
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Émise le {formatDate(invoice.issueDate)}
            </p>
            {invoice.dueDate ? (
              <p className="text-sm text-muted-foreground">
                Échéance : {formatDate(invoice.dueDate)}
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
            {invoice.items.map((item) => (
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
              value={formatCurrency(invoice.subtotal)}
            />
            {invoice.discount > 0 ? (
              <TotalRow
                label="Remise"
                value={`− ${formatCurrency(invoice.discount)}`}
              />
            ) : null}
            {invoice.vatRate > 0 ? (
              <TotalRow
                label={`TVA (${invoice.vatRate} %)`}
                value={formatCurrency(invoice.vatAmount)}
              />
            ) : null}
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCurrency(invoice.total)}</dd>
            </div>
            <TotalRow
              label="Déjà réglé"
              value={formatCurrency(invoice.paidAmount)}
            />
            <div className="flex items-center justify-between text-base font-semibold text-warning">
              <dt>Reste dû</dt>
              <dd className="tabular-nums">
                {formatCurrency(invoice.remainingAmount)}
              </dd>
            </div>
          </dl>
        </div>

        {invoice.payments.length > 0 ? (
          <section className="print-break space-y-2">
            <h2 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Règlements
            </h2>
            <ul className="space-y-1 text-sm">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex justify-between gap-4">
                  <span>
                    {formatDate(payment.paymentDate)} ·{" "}
                    {PAYMENT_METHOD_LABELS[
                      payment.method as keyof typeof PAYMENT_METHOD_LABELS
                    ] ?? payment.method}
                    {payment.transactionNumber
                      ? ` · ${payment.transactionNumber}`
                      : ""}
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(payment.paidAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {invoice.notes ? (
          <section className="print-break space-y-1">
            <h2 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h2>
            <p className="whitespace-pre-line text-sm">{invoice.notes}</p>
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
            href={patientPath(invoice.patientId)}
            className="text-primary underline-offset-2 hover:underline"
          >
            {invoice.patient.fileNumber}
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

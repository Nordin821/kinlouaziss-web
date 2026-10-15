import { Banknote, ReceiptText, Search, SlidersHorizontal, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { loadPatientOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { dayKey } from "@/lib/validations/appointment";
import { INVOICE_STATUSES } from "@/lib/validations/invoice";

import {
  InvoicesTable,
  NewInvoiceButton,
  type InvoiceRow,
} from "./invoices-table";

export const metadata = { title: "Factures" };

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

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/factures">) {
  const user = await requirePermission("invoices.view");
  const canManage = userHasPermission(user, "invoices.manage");

  const params = await searchParams;
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const from = parseDate(params.du, yearStart);
  const to = parseDate(params.au, today);
  const toExclusive = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.statut === "string" ? params.statut : "all";

  const [invoices, patients, settings, aggregate] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        deletedAt: null,
        issueDate: { gte: from, lt: toExclusive },
        ...(status !== "all" &&
        (INVOICE_STATUSES as readonly string[]).includes(status)
          ? { status }
          : {}),
        ...(query
          ? {
              OR: [
                { invoiceNumber: { contains: query, mode: "insensitive" as const } },
                {
                  patient: {
                    OR: [
                      { firstName: { contains: query, mode: "insensitive" as const } },
                      { lastName: { contains: query, mode: "insensitive" as const } },
                      { fileNumber: { contains: query, mode: "insensitive" as const } },
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ issueDate: "desc" }, { id: "desc" }],
      take: 200,
      include: {
        patient: {
          select: { firstName: true, lastName: true, fileNumber: true },
        },
        items: { select: { description: true, quantity: true, unitPrice: true } },
      },
    }),
    canManage ? loadPatientOptions() : Promise.resolve([]),
    loadSettings(),
    prisma.invoice.aggregate({
      where: { deletedAt: null, issueDate: { gte: from, lt: toExclusive } },
      _sum: { total: true, paidAmount: true, remainingAmount: true },
    }),
  ]);

  const rows: InvoiceRow[] = invoices.map((invoice) => ({
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
    invoiceNumber: invoice.invoiceNumber,
    patientName: `${invoice.patient.lastName.toUpperCase()} ${invoice.patient.firstName}`,
    patientFile: invoice.patient.fileNumber,
    issueDateLabel: formatDate(invoice.issueDate),
    total: invoice.total,
    paidAmount: invoice.paidAmount,
    remainingAmount: invoice.remainingAmount,
    status: invoice.status,
  }));

  const totalInvoiced = aggregate._sum.total ?? 0;
  const totalPaid = aggregate._sum.paidAmount ?? 0;
  const totalDue = aggregate._sum.remainingAmount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description={`${invoices.length} facture${invoices.length > 1 ? "s" : ""} entre le ${formatDate(from)} et le ${formatDate(to)} · ${settings.currencySymbol}`}
        actions={
          canManage && patients.length > 0 ? (
            <NewInvoiceButton
              patients={patients}
              defaultDate={dayKey(today)}
              defaultUnitPrice={settings.sessionDefaultPrice}
            />
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total facturé"
          value={formatCurrency(totalInvoiced)}
          hint="sur la période"
          icon={ReceiptText}
          tone="primary"
        />
        <StatCard
          label="Encaissé"
          value={formatCurrency(totalPaid)}
          hint="règlements reçus"
          icon={Banknote}
          tone="success"
        />
        <StatCard
          label="Reste dû"
          value={formatCurrency(totalDue)}
          hint="à recouvrer"
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Factures"
          value={invoices.length}
          hint="documents émis"
          icon={ReceiptText}
          tone="info"
        />
      </div>

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
              placeholder="Rechercher un numéro, un patient…"
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
                <SelectItem value="unpaid">Impayées</SelectItem>
                <SelectItem value="partial">Partielles</SelectItem>
                <SelectItem value="paid">Payées</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </div>
        </form>
      </Card>

      <InvoicesTable invoices={rows} patients={patients} canManage={canManage} />
    </div>
  );
}

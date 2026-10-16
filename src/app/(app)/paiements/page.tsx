import { Banknote, Search, SlidersHorizontal, TrendingUp, Wallet } from "lucide-react";

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
import { StatCard } from "@/components/ui/stat-card";
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
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  settlementStatus,
} from "@/lib/validations/payment";

import { NewPaymentButton, PaymentsTable, type PaymentRow } from "./payments-table";

export const metadata = { title: "Paiements" };

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

export default async function PaymentsPage({
  searchParams,
}: PageProps<"/paiements">) {
  const user = await requirePermission("payments.view");
  const canManage = userHasPermission(user, "payments.manage");

  const params = await searchParams;
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = parseDate(params.du, monthStart);
  const to = parseDate(params.au, today);
  const toExclusive = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const method = typeof params.methode === "string" ? params.methode : "all";
  const settlement = typeof params.reglement === "string" ? params.reglement : "all";

  const [payments, patients, sessions, invoices, settings] = await Promise.all([
    prisma.payment.findMany({
      where: {
        deletedAt: null,
        paymentDate: { gte: from, lt: toExclusive },
        ...(method !== "all" &&
        (PAYMENT_METHODS as readonly string[]).includes(method)
          ? { method }
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
      orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
      take: 500,
      include: {
        patient: {
          select: { firstName: true, lastName: true, fileNumber: true },
        },
        invoice: { select: { invoiceNumber: true } },
      },
    }),
    loadPatientOptions(),
    canManage ? loadSessionOptions() : Promise.resolve([]),
    canManage ? loadInvoiceOptions() : Promise.resolve([]),
    loadSettings(),
  ]);

  const filtered =
    settlement === "all"
      ? payments
      : payments.filter(
          (payment) =>
            settlementStatus(payment.amount, payment.paidAmount) === settlement,
        );

  const rows: PaymentRow[] = filtered.map((payment) => ({
    id: payment.id,
    patientId: payment.patientId,
    sessionId: payment.sessionId,
    invoiceId: payment.invoiceId,
    date: dayKey(payment.paymentDate),
    amount: payment.amount,
    paidAmount: payment.paidAmount,
    method: payment.method,
    transactionNumber: payment.transactionNumber ?? "",
    notes: payment.notes ?? "",
    patientName: `${payment.patient.lastName.toUpperCase()} ${payment.patient.firstName}`,
    patientFile: payment.patient.fileNumber,
    dateLabel: formatDate(payment.paymentDate),
    methodLabel:
      PAYMENT_METHOD_LABELS[
        payment.method as keyof typeof PAYMENT_METHOD_LABELS
      ] ?? payment.method,
    invoiceNumber: payment.invoice?.invoiceNumber ?? null,
  }));

  const collected = filtered.reduce((sum, p) => sum + p.paidAmount, 0);
  const due = filtered.reduce(
    (sum, p) => sum + Math.max(0, p.amount - p.paidAmount),
    0,
  );
  const uniquePatients = new Set(filtered.map((p) => p.patientId)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description={`${filtered.length} encaissement${filtered.length > 1 ? "s" : ""} entre le ${formatDate(from)} et le ${formatDate(to)} · ${settings.currencySymbol}`}
        actions={
          <>
            <RefreshButton />
            {canManage && patients.length > 0 ? (
              <NewPaymentButton
                patients={patients}
                sessions={sessions}
                invoices={invoices}
                defaultDate={dayKey(today)}
                defaultAmount={settings.sessionDefaultPrice}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total encaissé"
          value={formatCurrency(collected)}
          hint="sur la période filtrée"
          icon={Banknote}
          tone="success"
        />
        <StatCard
          label="Reste à encaisser"
          value={formatCurrency(due)}
          hint="paiements partiels"
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Encaissements"
          value={filtered.length}
          hint="opérations enregistrées"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Patients"
          value={uniquePatients}
          hint="patients ayant réglé"
          icon={Wallet}
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
            <Select name="methode" defaultValue={method}>
              <SelectTrigger className="w-44">
                <SlidersHorizontal className="size-4 opacity-60" />
                <SelectValue placeholder="Moyen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les moyens</SelectItem>
                {PAYMENT_METHODS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PAYMENT_METHOD_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="reglement" defaultValue={settlement}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Règlement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les règlements</SelectItem>
                <SelectItem value="paid">Réglé</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="unpaid">Impayé</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </div>
        </form>
      </Card>

      <PaymentsTable
        payments={rows}
        patients={patients}
        sessions={sessions}
        invoices={invoices}
        canManage={canManage}
      />
    </div>
  );
}

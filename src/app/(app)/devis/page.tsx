import { FileCheck2, FileText, Search, SlidersHorizontal } from "lucide-react";

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
import { loadPatientOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";
import { dayKey } from "@/lib/validations/appointment";
import {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
} from "@/lib/validations/quote";

import { NewQuoteButton, QuotesTable, type QuoteRow } from "./quotes-table";

export const metadata = { title: "Devis" };

export default async function QuotesPage({
  searchParams,
}: PageProps<"/devis">) {
  const user = await requirePermission("quotes.view");
  const canManage = userHasPermission(user, "quotes.manage");
  const canConvert = userHasPermission(user, "invoices.manage");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.statut === "string" ? params.statut : "all";

  const [quotes, patients, settings] = await Promise.all([
    prisma.quote.findMany({
      where: {
        deletedAt: null,
        ...(status !== "all" &&
        (QUOTE_STATUSES as readonly string[]).includes(status)
          ? { status }
          : {}),
        ...(query
          ? {
              OR: [
                { quoteNumber: { contains: query, mode: "insensitive" as const } },
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
  ]);

  const rows: QuoteRow[] = quotes.map((quote) => ({
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
    quoteNumber: quote.quoteNumber,
    patientName: `${quote.patient.lastName.toUpperCase()} ${quote.patient.firstName}`,
    patientFile: quote.patient.fileNumber,
    issueDateLabel: formatDate(quote.issueDate),
    total: quote.total,
  }));

  const accepted = quotes.filter((quote) => quote.status === "accepted");
  const pending = quotes.filter((quote) =>
    ["draft", "sent"].includes(quote.status),
  );
  const acceptedValue = accepted.reduce((sum, quote) => sum + quote.total, 0);
  const pendingValue = pending.reduce((sum, quote) => sum + quote.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devis"
        description={`${quotes.length} devis enregistré${quotes.length > 1 ? "s" : ""} · ${settings.currencySymbol}`}
        actions={
          <>
            <RefreshButton />
            {canManage && patients.length > 0 ? (
              <NewQuoteButton
                patients={patients}
                defaultDate={dayKey(new Date())}
                defaultUnitPrice={settings.sessionDefaultPrice}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Devis"
          value={quotes.length}
          hint="documents émis"
          icon={FileText}
          tone="primary"
        />
        <StatCard
          label="Acceptés"
          value={accepted.length}
          hint={formatCurrency(acceptedValue)}
          icon={FileCheck2}
          tone="success"
        />
        <StatCard
          label="En attente"
          value={pending.length}
          hint={formatCurrency(pendingValue)}
          icon={FileText}
          tone="warning"
        />
        <StatCard
          label="Montant total"
          value={formatCurrency(
            quotes.reduce((sum, quote) => sum + quote.total, 0),
          )}
          hint="toutes propositions"
          icon={FileText}
          tone="info"
        />
      </div>

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Rechercher un numéro, un patient…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select name="statut" defaultValue={status}>
              <SelectTrigger className="w-40">
                <SlidersHorizontal className="size-4 opacity-60" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {QUOTE_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {QUOTE_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </div>
        </form>
      </Card>

      <QuotesTable
        quotes={rows}
        patients={patients}
        canManage={canManage}
        canConvert={canConvert}
      />
    </div>
  );
}

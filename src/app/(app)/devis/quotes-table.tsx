"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Eye,
  FileCheck,
  FileText,
  FilePlus2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { convertQuoteToInvoice, deleteQuote, setQuoteStatus } from "@/app/actions/quotes";
import { QUOTE_STATUS_LABELS } from "@/lib/validations/quote";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  secondaryColumn,
} from "@/components/ui/table";
import { patientPath } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { PatientOption } from "@/lib/options";

import { QuoteFormDialog, type QuoteFormData } from "./quote-form-dialog";

export type QuoteRow = QuoteFormData & {
  quoteNumber: string;
  patientName: string;
  patientFile: string;
  issueDateLabel: string;
  total: number;
};

/** Statuts proposés en raccourci dans la liste des devis. */
const QUICK_STATUSES = ["sent", "accepted", "rejected"] as const;

export function QuotesTable({
  quotes,
  patients,
  canManage,
  canConvert,
}: {
  quotes: QuoteRow[];
  patients: PatientOption[];
  canManage: boolean;
  canConvert: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete(quote: QuoteRow) {
    startTransition(async () => {
      const result = await deleteQuote(quote.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Devis supprimé.");
    });
  }

  function handleConvert(quote: QuoteRow) {
    startTransition(async () => {
      const result = await convertQuoteToInvoice(quote.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Devis converti en facture.");
    });
  }

  function changeStatus(quote: QuoteRow, status: string, label: string) {
    startTransition(async () => {
      const result = await setQuoteStatus(quote.id, status);
      if (result && "error" in result) toast.error(result.error);
      else toast.success(label);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={secondaryColumn}>Numéro</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className={secondaryColumn}>Émission</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-auto text-right sm:w-12">
              <span className="sr-only sm:not-sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.length === 0 ? (
            <TableEmpty colSpan={6}>
              <EmptyState
                icon={FileText}
                title="Aucun devis"
                description="Créez un devis pour chiffrer une prise en charge avant de la facturer."
              />
            </TableEmpty>
          ) : (
            quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className={`${secondaryColumn} font-mono text-xs`}>
                  <Link
                    href={`/devis/${quote.id}`}
                    className="font-medium text-primary"
                  >
                    {quote.quoteNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={patientPath(quote.patientId)}>
                    <span className="block font-medium">{quote.patientName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {quote.patientFile}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className={`${secondaryColumn} text-muted-foreground`}>
                  {quote.issueDateLabel}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(quote.total)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={quote.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/devis/${quote.id}`}>
                          <Eye />
                          Consulter
                        </Link>
                      </DropdownMenuItem>
                      {canManage ? (
                        <>
                          <QuoteFormDialog
                            patients={patients}
                            quote={quote}
                            trigger={
                              <DropdownMenuItem
                                disabled={pending}
                                onSelect={(event) => event.preventDefault()}
                              >
                                <Pencil />
                                Modifier
                              </DropdownMenuItem>
                            }
                          />
                          {canConvert && quote.status !== "accepted" ? (
                            <DropdownMenuItem
                              disabled={pending}
                              onSelect={(event) => {
                                event.preventDefault();
                                handleConvert(quote);
                              }}
                            >
                              <FilePlus2 />
                              Convertir en facture
                            </DropdownMenuItem>
                          ) : null}
                          {QUICK_STATUSES.filter(
                            (status) => status !== quote.status,
                          ).map((status) => (
                            <DropdownMenuItem
                              key={status}
                              disabled={pending}
                              onSelect={() =>
                                changeStatus(
                                  quote,
                                  status,
                                  `Statut mis à jour : ${QUOTE_STATUS_LABELS[status].toLowerCase()}.`,
                                )
                              }
                            >
                              <FileCheck />
                              Marquer {QUOTE_STATUS_LABELS[status].toLowerCase()}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <ConfirmDialog
                            title="Supprimer le devis"
                            description={`Le devis ${quote.quoteNumber} sera supprimé.`}
                            confirmLabel="Supprimer"
                            destructive
                            onConfirm={() => handleDelete(quote)}
                            trigger={
                              <DropdownMenuItem
                                disabled={pending}
                                onSelect={(event) => event.preventDefault()}
                                className="text-danger focus:text-danger"
                              >
                                <Trash2 />
                                Supprimer
                              </DropdownMenuItem>
                            }
                          />
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function NewQuoteButton({
  patients,
  defaultDate,
  defaultUnitPrice,
}: {
  patients: PatientOption[];
  defaultDate: string;
  defaultUnitPrice?: string;
}) {
  return (
    <QuoteFormDialog
      patients={patients}
      defaultDate={defaultDate}
      defaultUnitPrice={defaultUnitPrice}
      trigger={
        <Button>
          <Plus />
          Nouveau devis
        </Button>
      }
    />
  );
}

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteInvoice } from "@/app/actions/invoices";
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
} from "@/components/ui/table";
import { patientPath } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { PatientOption } from "@/lib/options";

import {
  InvoiceFormDialog,
  type InvoiceFormData,
} from "./invoice-form-dialog";

export type InvoiceRow = InvoiceFormData & {
  invoiceNumber: string;
  patientName: string;
  patientFile: string;
  issueDateLabel: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
};

export function InvoicesTable({
  invoices,
  patients,
  canManage,
}: {
  invoices: InvoiceRow[];
  patients: PatientOption[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete(invoice: InvoiceRow) {
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Facture supprimée.");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numéro</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Émission</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Reste dû</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableEmpty colSpan={7}>
              <EmptyState
                icon={ReceiptText}
                title="Aucune facture"
                description="Créez une facture pour suivre les règlements de vos patients."
              />
            </TableEmpty>
          ) : (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/factures/${invoice.id}`}
                    className="font-medium text-primary"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={patientPath(invoice.patientId)}>
                    <span className="block font-medium">
                      {invoice.patientName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {invoice.patientFile}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invoice.issueDateLabel}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(invoice.total)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span
                    className={
                      invoice.remainingAmount > 0
                        ? "font-medium text-warning"
                        : "text-muted-foreground"
                    }
                  >
                    {formatCurrency(invoice.remainingAmount)}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
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
                        <Link href={`/factures/${invoice.id}`}>
                          <Eye />
                          Consulter
                        </Link>
                      </DropdownMenuItem>
                      {canManage ? (
                        <>
                          <InvoiceFormDialog
                            patients={patients}
                            invoice={invoice}
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
                          <DropdownMenuSeparator />
                          <ConfirmDialog
                            title="Supprimer la facture"
                            description={`La facture ${invoice.invoiceNumber} sera supprimée.`}
                            confirmLabel="Supprimer"
                            destructive
                            onConfirm={() => handleDelete(invoice)}
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

export function NewInvoiceButton({
  patients,
  defaultDate,
  defaultUnitPrice,
}: {
  patients: PatientOption[];
  defaultDate: string;
  defaultUnitPrice?: string;
}) {
  return (
    <InvoiceFormDialog
      patients={patients}
      defaultDate={defaultDate}
      defaultUnitPrice={defaultUnitPrice}
      trigger={
        <Button>
          <Plus />
          Nouvelle facture
        </Button>
      }
    />
  );
}

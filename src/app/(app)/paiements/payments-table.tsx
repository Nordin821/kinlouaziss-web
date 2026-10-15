"use client";

import { useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { deletePayment } from "@/app/actions/payments";
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
import type {
  InvoiceOption,
  PatientOption,
  SessionOption,
} from "@/lib/options";
import { settlementStatus } from "@/lib/validations/payment";

import { PaymentFormDialog, type PaymentFormData } from "./payment-form-dialog";

export type PaymentRow = PaymentFormData & {
  patientName: string;
  patientFile: string;
  dateLabel: string;
  methodLabel: string;
  invoiceNumber: string | null;
};

export function PaymentsTable({
  payments,
  patients,
  sessions,
  invoices,
  canManage,
}: {
  payments: PaymentRow[];
  patients: PatientOption[];
  sessions: SessionOption[];
  invoices: InvoiceOption[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete(payment: PaymentRow) {
    startTransition(async () => {
      const result = await deletePayment(payment.id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Paiement supprimé.");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead className="text-right">Montant dû</TableHead>
            <TableHead className="text-right">Réglé</TableHead>
            <TableHead>Règlement</TableHead>
            <TableHead>Facture</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableEmpty colSpan={7}>
              <EmptyState
                icon={Wallet}
                title="Aucun paiement"
                description="Enregistrez un encaissement pour suivre la trésorerie du cabinet."
              />
            </TableEmpty>
          ) : (
            payments.map((payment) => {
              const status = settlementStatus(
                payment.amount,
                payment.paidAmount,
              );
              return (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {payment.dateLabel}
                  </TableCell>
                  <TableCell>
                    <Link href={patientPath(payment.patientId)}>
                      <span className="block font-medium">
                        {payment.patientName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {payment.patientFile}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="block font-medium">
                      {formatCurrency(payment.paidAmount)}
                    </span>
                    {status !== "paid" ? (
                      <span className="block text-xs text-muted-foreground">
                        reste {formatCurrency(payment.amount - payment.paidAmount)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="block text-sm">
                      {payment.methodLabel}
                    </span>
                    <span className="mt-1 block">
                      <StatusBadge status={status} />
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {payment.invoiceNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canManage ? (
                          <>
                            <PaymentFormDialog
                              patients={patients}
                              sessions={sessions}
                              invoices={invoices}
                              payment={payment}
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
                              title="Supprimer le paiement"
                              description={`Le paiement de ${formatCurrency(payment.paidAmount)} du ${payment.dateLabel} sera supprimé.`}
                              confirmLabel="Supprimer"
                              destructive
                              onConfirm={() => handleDelete(payment)}
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
                        ) : (
                          <DropdownMenuItem disabled>
                            Consultation seule
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function NewPaymentButton({
  patients,
  sessions,
  invoices,
  defaultDate,
  defaultAmount,
}: {
  patients: PatientOption[];
  sessions: SessionOption[];
  invoices: InvoiceOption[];
  defaultDate: string;
  defaultAmount?: string;
}) {
  return (
    <PaymentFormDialog
      patients={patients}
      sessions={sessions}
      invoices={invoices}
      defaultDate={defaultDate}
      defaultAmount={defaultAmount}
      trigger={
        <Button>
          <Plus />
          Nouveau paiement
        </Button>
      }
    />
  );
}

"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { nextInvoiceNumber } from "@/lib/document-numbers";
import {
  computeTotals,
  readLineItems,
  withLineTotal,
} from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { combineDateTime } from "@/lib/validations/appointment";
import { emptyToNull } from "@/lib/validations/common";
import {
  invoiceFormSchema,
  type InvoiceFormValues,
} from "@/lib/validations/invoice";

export type InvoiceActionState = { ok: true } | { error: string } | undefined;

function extractValues(formData: FormData): InvoiceFormValues {
  const raw = Object.fromEntries(formData.entries());
  return invoiceFormSchema.parse({
    patientId: raw.patientId,
    issueDate: raw.issueDate ?? "",
    dueDate: raw.dueDate ?? "",
    discount: raw.discount ?? "",
    vatRate: raw.vatRate ?? "",
    notes: raw.notes ?? "",
  });
}

async function requireManage() {
  const user = await requireUser();
  if (!userHasPermission(user, "invoices.manage")) {
    return { user: null, error: "Action non autorisée." } as const;
  }
  return { user, error: null } as const;
}

function revalidateInvoices(patientId: number): void {
  revalidatePath(ROUTES.invoices);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(`${ROUTES.patients}/${patientId}`);
}

export async function createInvoice(
  formData: FormData,
): Promise<InvoiceActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: InvoiceFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const items = readLineItems(formData);
  if (items.length === 0) {
    return { error: "Ajoutez au moins une ligne à la facture." };
  }

  const issueDate = combineDateTime(values.issueDate, "00:00");
  if (!issueDate) return { error: "Date d'émission invalide." };
  const dueDate = values.dueDate
    ? combineDateTime(values.dueDate, "00:00")
    : null;

  const totals = computeTotals(items, values.discount, values.vatRate);
  const invoiceNumber = await nextInvoiceNumber();

  try {
    const created = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId: values.patientId,
        issueDate,
        dueDate,
        subtotal: totals.subtotal,
        discount: totals.discount,
        vatRate: values.vatRate ?? 0,
        vatAmount: totals.vatAmount,
        total: totals.total,
        paidAmount: 0,
        remainingAmount: totals.total,
        status: "unpaid",
        notes: emptyToNull(values.notes),
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: withLineTotal(item).lineTotal,
          })),
        },
      },
      select: { id: true },
    });

    await logAudit(user, "invoice.create", "invoice", created.id, invoiceNumber);

    revalidateInvoices(values.patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de créer la facture." };
  }
}

export async function updateInvoice(
  invoiceId: number,
  formData: FormData,
): Promise<InvoiceActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: InvoiceFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const items = readLineItems(formData);
  if (items.length === 0) {
    return { error: "Ajoutez au moins une ligne à la facture." };
  }

  const issueDate = combineDateTime(values.issueDate, "00:00");
  if (!issueDate) return { error: "Date d'émission invalide." };
  const dueDate = values.dueDate
    ? combineDateTime(values.dueDate, "00:00")
    : null;

  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { paidAmount: true },
  });
  if (!existing) return { error: "Facture introuvable." };

  const totals = computeTotals(items, values.discount, values.vatRate);
  const paid = Math.min(existing.paidAmount, totals.total);
  const remaining = Number(Math.max(0, totals.total - paid).toFixed(2));

  try {
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          patientId: values.patientId,
          issueDate,
          dueDate,
          subtotal: totals.subtotal,
          discount: totals.discount,
          vatRate: values.vatRate ?? 0,
          vatAmount: totals.vatAmount,
          total: totals.total,
          paidAmount: paid,
          remainingAmount: remaining,
          status: remaining <= 0.005 ? "paid" : paid > 0 ? "partial" : "unpaid",
          notes: emptyToNull(values.notes),
          items: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: withLineTotal(item).lineTotal,
            })),
          },
        },
      }),
    ]);

    await logAudit(user, "invoice.update", "invoice", invoiceId);

    revalidateInvoices(values.patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de mettre à jour la facture." };
  }
}

/** Suppression logique d'une facture. */
export async function deleteInvoice(
  invoiceId: number,
): Promise<InvoiceActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { deletedAt: new Date() },
      select: { patientId: true },
    });

    await logAudit(user, "invoice.delete", "invoice", invoiceId);
    revalidateInvoices(invoice.patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer la facture." };
  }
}

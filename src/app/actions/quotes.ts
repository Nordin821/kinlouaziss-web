"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { nextInvoiceNumber, nextQuoteNumber } from "@/lib/document-numbers";
import {
  computeTotals,
  readLineItems,
  withLineTotal,
} from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { combineDateTime } from "@/lib/validations/appointment";
import { emptyToNull } from "@/lib/validations/common";
import {
  QUOTE_STATUSES,
  quoteFormSchema,
  type QuoteFormValues,
} from "@/lib/validations/quote";

export type QuoteActionState = { ok: true } | { error: string } | undefined;

function extractValues(formData: FormData): QuoteFormValues {
  const raw = Object.fromEntries(formData.entries());
  return quoteFormSchema.parse({
    patientId: raw.patientId,
    issueDate: raw.issueDate ?? "",
    validUntil: raw.validUntil ?? "",
    discount: raw.discount ?? "",
    vatRate: raw.vatRate ?? "",
    status: raw.status || "draft",
    notes: raw.notes ?? "",
  });
}

async function requireManage() {
  const user = await requireUser();
  if (!userHasPermission(user, "quotes.manage")) {
    return { user: null, error: "Action non autorisée." } as const;
  }
  return { user, error: null } as const;
}

function revalidateQuotes(patientId: number): void {
  revalidatePath(ROUTES.quotes);
  revalidatePath(`${ROUTES.patients}/${patientId}`);
}

export async function createQuote(
  formData: FormData,
): Promise<QuoteActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: QuoteFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const items = readLineItems(formData);
  if (items.length === 0) {
    return { error: "Ajoutez au moins une ligne au devis." };
  }

  const issueDate = combineDateTime(values.issueDate, "00:00");
  if (!issueDate) return { error: "Date d'émission invalide." };
  const validUntil = values.validUntil
    ? combineDateTime(values.validUntil, "00:00")
    : null;

  const totals = computeTotals(items, values.discount, values.vatRate);
  const quoteNumber = await nextQuoteNumber();

  try {
    const created = await prisma.quote.create({
      data: {
        quoteNumber,
        patientId: values.patientId,
        issueDate,
        validUntil,
        subtotal: totals.subtotal,
        discount: totals.discount,
        vatRate: values.vatRate ?? 0,
        vatAmount: totals.vatAmount,
        total: totals.total,
        status: values.status,
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

    await logAudit(user, "quote.create", "quote", created.id, quoteNumber);

    revalidateQuotes(values.patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de créer le devis." };
  }
}

export async function updateQuote(
  quoteId: number,
  formData: FormData,
): Promise<QuoteActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: QuoteFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const items = readLineItems(formData);
  if (items.length === 0) {
    return { error: "Ajoutez au moins une ligne au devis." };
  }

  const issueDate = combineDateTime(values.issueDate, "00:00");
  if (!issueDate) return { error: "Date d'émission invalide." };
  const validUntil = values.validUntil
    ? combineDateTime(values.validUntil, "00:00")
    : null;

  const totals = computeTotals(items, values.discount, values.vatRate);

  try {
    await prisma.$transaction([
      prisma.quoteItem.deleteMany({ where: { quoteId } }),
      prisma.quote.update({
        where: { id: quoteId },
        data: {
          patientId: values.patientId,
          issueDate,
          validUntil,
          subtotal: totals.subtotal,
          discount: totals.discount,
          vatRate: values.vatRate ?? 0,
          vatAmount: totals.vatAmount,
          total: totals.total,
          status: values.status,
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

    await logAudit(user, "quote.update", "quote", quoteId);

    revalidateQuotes(values.patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de mettre à jour le devis." };
  }
}

export async function setQuoteStatus(
  quoteId: number,
  status: string,
): Promise<QuoteActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  if (!(QUOTE_STATUSES as readonly string[]).includes(status)) {
    return { error: "Statut invalide." };
  }

  try {
    const quote = await prisma.quote.update({
      where: { id: quoteId },
      data: { status },
      select: { patientId: true },
    });

    await logAudit(user, "quote.status", "quote", quoteId, status);
    revalidateQuotes(quote.patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de modifier le statut." };
  }
}

/**
 * Convertit un devis accepté en facture.
 *
 * La facture reprend les lignes et les totaux du devis ; le devis passe au
 * statut « accepté » afin d'éviter une double conversion.
 */
export async function convertQuoteToInvoice(
  quoteId: number,
): Promise<QuoteActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, deletedAt: null },
    include: { items: true },
  });
  if (!quote) return { error: "Devis introuvable." };
  if (quote.items.length === 0) {
    return { error: "Le devis ne contient aucune ligne." };
  }

  if (!userHasPermission(user, "invoices.manage")) {
    return { error: "Vous n'êtes pas autorisé à créer des factures." };
  }

  const invoiceNumber = await nextInvoiceNumber();
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 30);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          patientId: quote.patientId,
          issueDate,
          dueDate,
          subtotal: quote.subtotal,
          discount: quote.discount,
          vatRate: quote.vatRate,
          vatAmount: quote.vatAmount,
          total: quote.total,
          paidAmount: 0,
          remainingAmount: quote.total,
          status: "unpaid",
          notes: quote.notes,
          items: {
            create: quote.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        select: { id: true },
      });

      await tx.quote.update({
        where: { id: quoteId },
        data: { status: "accepted" },
      });

      return invoice;
    });

    await logAudit(
      user,
      "quote.convert",
      "quote",
      quoteId,
      `facture ${invoiceNumber}`,
    );

    revalidateQuotes(quote.patientId);
    revalidatePath(ROUTES.invoices);
    revalidatePath(`${ROUTES.invoices}/${created.id}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de convertir le devis en facture." };
  }
}

/** Suppression logique d'un devis. */
export async function deleteQuote(
  quoteId: number,
): Promise<QuoteActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    const quote = await prisma.quote.update({
      where: { id: quoteId },
      data: { deletedAt: new Date() },
      select: { patientId: true },
    });

    await logAudit(user, "quote.delete", "quote", quoteId);
    revalidateQuotes(quote.patientId);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer le devis." };
  }
}

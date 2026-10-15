"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { recalculateInvoice } from "@/lib/invoice-totals";
import { prisma } from "@/lib/prisma";
import { combineDateTime } from "@/lib/validations/appointment";
import { emptyToNull, toIdOrNull } from "@/lib/validations/common";
import {
  paymentFormSchema,
  type PaymentFormValues,
} from "@/lib/validations/payment";

export type PaymentActionState = { ok: true } | { error: string } | undefined;

function extractValues(formData: FormData): PaymentFormValues {
  const raw = Object.fromEntries(formData.entries());
  return paymentFormSchema.parse({
    patientId: raw.patientId,
    sessionId: raw.sessionId ?? "",
    invoiceId: raw.invoiceId ?? "",
    date: raw.date ?? "",
    amount: raw.amount ?? "",
    // Un champ « montant réglé » laissé vide signifie : réglé en totalité.
    paidAmount: raw.paidAmount || raw.amount || "",
    method: raw.method || "cash",
    transactionNumber: raw.transactionNumber ?? "",
    notes: raw.notes ?? "",
  });
}

async function requireManage() {
  const user = await requireUser();
  if (!userHasPermission(user, "payments.manage")) {
    return { user: null, error: "Action non autorisée." } as const;
  }
  return { user, error: null } as const;
}

export async function createPayment(
  formData: FormData,
): Promise<PaymentActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: PaymentFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const paymentDate = combineDateTime(values.date, "00:00");
  if (!paymentDate) return { error: "Date de paiement invalide." };

  const amount = Number(values.amount.toFixed(2));
  const paidAmount = Number(values.paidAmount.toFixed(2));
  const invoiceId = toIdOrNull(values.invoiceId);

  try {
    const created = await prisma.payment.create({
      data: {
        patientId: values.patientId,
        sessionId: toIdOrNull(values.sessionId),
        invoiceId,
        amount,
        paidAmount,
        remainingAmount: Number(Math.max(0, amount - paidAmount).toFixed(2)),
        method: values.method,
        paymentDate,
        transactionNumber: emptyToNull(values.transactionNumber),
        notes: emptyToNull(values.notes),
      },
      select: { id: true },
    });

    if (invoiceId) await recalculateInvoice(invoiceId);

    await logAudit(
      user,
      "payment.create",
      "payment",
      created.id,
      `${paidAmount} ${values.method}`,
    );

    revalidatePath(ROUTES.payments);
    revalidatePath(ROUTES.invoices);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${values.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer le paiement." };
  }
}

export async function updatePayment(
  paymentId: number,
  formData: FormData,
): Promise<PaymentActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  let values: PaymentFormValues;
  try {
    values = extractValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const paymentDate = combineDateTime(values.date, "00:00");
  if (!paymentDate) return { error: "Date de paiement invalide." };

  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { invoiceId: true },
  });
  if (!existing) return { error: "Paiement introuvable." };

  const amount = Number(values.amount.toFixed(2));
  const paidAmount = Number(values.paidAmount.toFixed(2));
  const invoiceId = toIdOrNull(values.invoiceId);

  try {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        patientId: values.patientId,
        sessionId: toIdOrNull(values.sessionId),
        invoiceId,
        amount,
        paidAmount,
        remainingAmount: Number(Math.max(0, amount - paidAmount).toFixed(2)),
        method: values.method,
        paymentDate,
        transactionNumber: emptyToNull(values.transactionNumber),
        notes: emptyToNull(values.notes),
      },
    });

    if (existing.invoiceId) await recalculateInvoice(existing.invoiceId);
    if (invoiceId && invoiceId !== existing.invoiceId) {
      await recalculateInvoice(invoiceId);
    }

    await logAudit(user, "payment.update", "payment", paymentId);

    revalidatePath(ROUTES.payments);
    revalidatePath(ROUTES.invoices);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${values.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de mettre à jour le paiement." };
  }
}

/** Suppression logique d'un paiement. */
export async function deletePayment(
  paymentId: number,
): Promise<PaymentActionState> {
  const { user, error } = await requireManage();
  if (!user) return { error };

  try {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { deletedAt: new Date() },
      select: { invoiceId: true, patientId: true },
    });

    if (payment.invoiceId) await recalculateInvoice(payment.invoiceId);

    await logAudit(user, "payment.delete", "payment", paymentId);

    revalidatePath(ROUTES.payments);
    revalidatePath(ROUTES.invoices);
    revalidatePath(ROUTES.dashboard);
    revalidatePath(`${ROUTES.patients}/${payment.patientId}`);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer le paiement." };
  }
}

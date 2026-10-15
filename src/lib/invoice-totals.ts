import { prisma } from "@/lib/prisma";
import { settlementStatus } from "@/lib/validations/payment";

/**
 * Recalcule les montants réglé / restant et le statut d'une facture
 * à partir de l'ensemble de ses paiements non supprimés.
 *
 * Utilisé après toute création, modification ou suppression de paiement
 * rattaché à une facture, afin que les soldes restent cohérents.
 */
export async function recalculateInvoice(invoiceId: number): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { total: true },
  });
  if (!invoice) return;

  const aggregate = await prisma.payment.aggregate({
    where: { invoiceId, deletedAt: null },
    _sum: { paidAmount: true },
  });

  const paid = Number((aggregate._sum.paidAmount ?? 0).toFixed(2));
  const remaining = Number(Math.max(0, invoice.total - paid).toFixed(2));

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: paid,
      remainingAmount: remaining,
      status: settlementStatus(invoice.total, paid),
    },
  });
}

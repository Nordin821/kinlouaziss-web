/** Logique partagée par les documents facturés (factures et devis). */

export type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

/** Arrondit un montant à deux décimales (évite les erreurs de flottants). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Lit les lignes d'un document depuis un formulaire.
 *
 * Les champs sont envoyés en listes parallèles (`itemDescription`,
 * `itemQuantity`, `itemUnitPrice`) : les lignes entièrement vides sont ignorées.
 */
export function readLineItems(formData: FormData): LineItemInput[] {
  const descriptions = formData.getAll("itemDescription").map(String);
  const quantities = formData.getAll("itemQuantity").map(String);
  const prices = formData.getAll("itemUnitPrice").map(String);

  const items: LineItemInput[] = [];
  descriptions.forEach((rawDescription, index) => {
    const description = rawDescription.trim();
    const quantity = Number(quantities[index]);
    const unitPrice = Number(prices[index]);

    const safeQuantity =
      Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const safePrice = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;

    if (!description && safePrice === 0) return;

    items.push({
      description: description || "Prestation",
      quantity: safeQuantity,
      unitPrice: safePrice,
    });
  });

  return items;
}

export type DocumentTotals = {
  subtotal: number;
  discount: number;
  vatAmount: number;
  total: number;
};

/** Calcule sous-total, remise, TVA et total d'un document. */
export function computeTotals(
  items: LineItemInput[],
  discount: number | undefined,
  vatRate: number | undefined,
): DocumentTotals {
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const safeDiscount = round2(
    Math.min(Math.max(0, discount ?? 0), subtotal),
  );
  const base = round2(subtotal - safeDiscount);
  const vatAmount = round2(base * ((vatRate ?? 0) / 100));

  return {
    subtotal,
    discount: safeDiscount,
    vatAmount,
    total: round2(base + vatAmount),
  };
}

/** Ligne d'un document, enrichie de son total. */
export function withLineTotal(item: LineItemInput) {
  return { ...item, lineTotal: round2(item.quantity * item.unitPrice) };
}

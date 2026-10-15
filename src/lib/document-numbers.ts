import { nextNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";

/**
 * Calcule un numéro de document à partir du dernier numéro utilisé en base,
 * en tenant compte du compteur enregistré dans les paramètres.
 *
 * La table reste la source de vérité (aucune collision possible), tandis que le
 * paramètre `*_next_number` sert de plancher afin de respecter une éventuelle
 * numérotation saisie manuellement depuis l'écran Paramètres.
 */
function buildNumber(
  prefix: string,
  lastValue: string | null | undefined,
  settingValue: string,
): string {
  const fromTable = lastValue
    ? Number.parseInt(lastValue.replace(/\D/g, ""), 10)
    : 0;
  const fromSetting = Number.parseInt(settingValue, 10) || 0;
  const floor = Math.max(
    Number.isFinite(fromTable) ? fromTable : 0,
    fromSetting - 1,
  );

  return nextNumber(prefix, `${prefix}-${String(floor).padStart(5, "0")}`);
}

/** Génère le prochain numéro de facture (« FAC-00001 »). */
export async function nextInvoiceNumber(): Promise<string> {
  const settings = await loadSettings();
  const prefix = settings.invoicePrefix;

  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: `${prefix}-` } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  return buildNumber(prefix, last?.invoiceNumber, settings.invoiceNextNumber);
}

/** Génère le prochain numéro de devis (« DEV-00001 »). */
export async function nextQuoteNumber(): Promise<string> {
  const settings = await loadSettings();
  const prefix = settings.quotePrefix;

  const last = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: `${prefix}-` } },
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  });

  return buildNumber(
    prefix,
    last?.quoteNumber,
    settings.values.quote_next_number ?? "",
  );
}

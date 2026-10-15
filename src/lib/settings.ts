import { cache } from "react";

import { prisma } from "@/lib/prisma";

/** Paramètres du cabinet, exposés avec des valeurs par défaut sûres. */
export type ClinicSettings = {
  clinicName: string;
  clinicAddress: string;
  clinicCity: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicTaxId: string;
  currencyCode: string;
  currencySymbol: string;
  invoicePrefix: string;
  invoiceNextNumber: string;
  invoiceFooterNote: string;
  quotePrefix: string;
  sessionDefaultDuration: string;
  sessionDefaultPrice: string;
  /** Toutes les paires clé/valeur brutes (pour l'écran Paramètres). */
  values: Record<string, string>;
};

const DEFAULTS: Record<string, string> = {
  clinic_name: "Cabinet KinLouaziss",
  currency_code: "MAD",
  currency_symbol: "DH",
  invoice_prefix: "FAC",
  invoice_next_number: "1",
  quote_prefix: "DEV",
  session_default_duration: "45",
  session_default_price: "250",
};

/** Charge les paramètres du cabinet (mémoïsé pour la durée du rendu). */
export const loadSettings = cache(async (): Promise<ClinicSettings> => {
  const rows = await prisma.clinicSetting.findMany();

  const values: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) values[row.key] = row.value ?? "";

  const pick = (key: string) => values[key]?.trim() || DEFAULTS[key] || "";

  return {
    clinicName: pick("clinic_name"),
    clinicAddress: values.clinic_address?.trim() ?? "",
    clinicCity: values.clinic_city?.trim() ?? "",
    clinicPhone: values.clinic_phone?.trim() ?? "",
    clinicEmail: values.clinic_email?.trim() ?? "",
    clinicTaxId: values.clinic_tax_id?.trim() ?? "",
    currencyCode: pick("currency_code"),
    currencySymbol: pick("currency_symbol"),
    invoicePrefix: pick("invoice_prefix"),
    invoiceNextNumber: pick("invoice_next_number"),
    invoiceFooterNote: values.invoice_footer_note?.trim() ?? "",
    quotePrefix: pick("quote_prefix"),
    sessionDefaultDuration: pick("session_default_duration"),
    sessionDefaultPrice: pick("session_default_price"),
    values,
  };
});

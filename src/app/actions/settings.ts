"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export type SettingsActionState = { ok: true } | { error: string } | undefined;

/**
 * Clés éditables depuis l'écran Paramètres.
 *
 * La liste est volontairement fermée : seules ces clés peuvent être écrites,
 * ce qui évite toute injection arbitraire dans `clinic_settings`.
 */
const TEXT_KEYS = [
  "clinic_name",
  "clinic_address",
  "clinic_city",
  "clinic_phone",
  "clinic_email",
  "clinic_tax_id",
  "invoice_prefix",
  "invoice_footer_note",
  "quote_prefix",
  "date_format",
  "time_format",
  "backup_folder",
  "auto_backup_frequency",
] as const;

const NUMBER_KEYS = [
  "invoice_next_number",
  "quote_next_number",
  "session_default_duration",
  "session_default_price",
] as const;

const BOOLEAN_KEYS = ["auto_backup_enabled", "demo_mode"] as const;

const DEFAULTS: Record<string, string> = {
  date_format: "dd/MM/yyyy",
  time_format: "HH:mm",
  auto_backup_frequency: "daily",
};

/** Enregistre les paramètres du cabinet (réservé aux administrateurs). */
export async function saveSettings(
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireUser();
  if (!userHasPermission(user, "settings.manage")) {
    return { error: "Action non autorisée." };
  }

  const entries: [string, string][] = [];

  for (const key of TEXT_KEYS) {
    const value = formData.get(key);
    entries.push([key, typeof value === "string" ? value.trim() : ""]);
  }

  for (const key of NUMBER_KEYS) {
    const value = formData.get(key);
    const raw = typeof value === "string" ? value.trim() : "";
    if (raw === "") {
      entries.push([key, "0"]);
      continue;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: "Les valeurs numériques doivent être positives." };
    }
    entries.push([key, String(parsed)]);
  }

  for (const key of BOOLEAN_KEYS) {
    entries.push([key, formData.get(key) === "on" ? "true" : "false"]);
  }

  const clinicName = entries.find(([key]) => key === "clinic_name")?.[1];
  if (!clinicName) {
    return { error: "Le nom du cabinet est obligatoire." };
  }

  const email = entries.find(([key]) => key === "clinic_email")?.[1];
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "L'adresse e-mail du cabinet est invalide." };
  }

  const currencyCode = formData.get("currency_code");
  const currencySymbol = formData.get("currency_symbol");
  if (typeof currencyCode === "string" && currencyCode.trim()) {
    entries.push(["currency_code", currencyCode.trim().toUpperCase()]);
  }
  if (typeof currencySymbol === "string" && currencySymbol.trim()) {
    entries.push(["currency_symbol", currencySymbol.trim()]);
  }

  try {
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.clinicSetting.upsert({
          where: { key },
          update: { value: value || DEFAULTS[key] || value },
          create: { key, value: value || DEFAULTS[key] || value },
        }),
      ),
    );

    await logAudit(user, "settings.update", "settings", "clinic", clinicName);

    revalidatePath(ROUTES.settings);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { error: "Impossible d'enregistrer les paramètres." };
  }
}

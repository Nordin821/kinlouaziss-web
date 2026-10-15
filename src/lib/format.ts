import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_LOCALE,
} from "@/lib/constants";

const dateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function asDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formate une date au format jj/mm/aaaa. */
export function formatDate(value: Date | string | number | null | undefined): string {
  const date = asDate(value);
  return date ? dateFormatter.format(date) : "—";
}

/** Formate une date et une heure. */
export function formatDateTime(
  value: Date | string | number | null | undefined,
): string {
  const date = asDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}

/** Formate une heure (hh:mm). */
export function formatTime(value: Date | string | number | null | undefined): string {
  const date = asDate(value);
  return date ? timeFormatter.format(date) : "—";
}

/** Formate une date en toutes lettres (« lundi 14 octobre 2026 »). */
export function formatLongDate(
  value: Date | string | number | null | undefined,
): string {
  const date = asDate(value);
  return date ? longDateFormatter.format(date) : "—";
}

/** Convertit une date en valeur pour un champ <input type="date">. */
export function toDateInputValue(
  value: Date | string | number | null | undefined,
): string {
  const date = asDate(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Convertit une date en valeur pour un champ <input type="datetime-local">. */
export function toDateTimeInputValue(
  value: Date | string | number | null | undefined,
): string {
  const date = asDate(value);
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}T${hours}:${minutes}`;
}

/** Formate un montant avec la devise (« 1 250,00 DH »). */
export function formatCurrency(
  value: number | null | undefined,
  symbol: string = DEFAULT_CURRENCY_SYMBOL,
): string {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${symbol}`;
}

/** Calcule l'âge en années à partir d'une date de naissance. */
export function calculateAge(
  birthDate: Date | string | number | null | undefined,
): number | null {
  const date = asDate(birthDate);
  if (!date) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/** Nom d'affichage d'un patient ou d'un thérapeute. */
export function fullName(firstName: string, lastName: string): string {
  return `${lastName.toUpperCase()} ${firstName}`.trim();
}

import { z } from "zod";

import { SESSION_TYPES } from "@/lib/validations/session";

export const APPOINTMENT_STATUSES = [
  "planned",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  planned: "Planifié",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

const sessionTypeCodes = SESSION_TYPES;

export const appointmentFormSchema = z.object({
  patientId: z.coerce.number().int().positive("Sélectionnez un patient."),
  /** "0" ou vide = aucun thérapeute assigné. */
  therapistId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/, "Heure invalide."),
  duration: z.coerce
    .number()
    .int()
    .min(5, "Durée minimale : 5 minutes.")
    .max(480, "Durée maximale : 8 heures."),
  sessionType: z.enum(sessionTypeCodes),
  status: z.enum(APPOINTMENT_STATUSES),
  notes: z.string().trim().max(2000).optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

/** Combine une date (`aaaa-mm-jj`) et une heure (`hh:mm`) en `Date` locale. */
export function combineDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const value = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  );

  return Number.isNaN(value.getTime()) ? null : value;
}

/** Valeur `hh:mm` d'une date, pour un champ `<input type="time">`. */
export function toTimeInputValue(value: Date): string {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Lundi (00:00) de la semaine contenant la date donnée. */
export function startOfWeek(value: Date): Date {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = result.getDay(); // 0 = dimanche
  const offset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + offset);
  return result;
}

/** Ajoute un nombre de jours à une date (nouvelle instance). */
export function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

/** Clé `aaaa-mm-jj` d'une date locale. */
export function dayKey(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

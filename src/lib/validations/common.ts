import { z } from "zod";

/**
 * Champ numérique entier facultatif.
 *
 * Une valeur vide (`""`) reste `undefined` : sans ce traitement,
 * `z.coerce.number()` la convertirait en `0`.
 */
export function optionalInt(max: number, min = 0) {
  return z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.coerce.number().int().min(min).max(max).optional(),
  );
}

/** Champ numérique décimal facultatif (quantités, mesures). */
export function optionalNumber(max: number, min = 0) {
  return z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.coerce.number().min(min).max(max).optional(),
  );
}

/** Champ numérique décimal obligatoire (montants). */
export function requiredNumber(max: number, min = 0) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.number().min(min).max(max),
  );
}

/** Convertit une chaîne vide en `null` (colonnes texte facultatives). */
export function emptyToNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Convertit un identifiant texte de formulaire en entier, ou `null`. */
export function toIdOrNull(value: string | undefined | null): number | null {
  if (!value || value === "0") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

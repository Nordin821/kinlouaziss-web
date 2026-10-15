/**
 * Construit le numéro suivant d'une séquence préfixée.
 *
 * Exemple : `nextNumber("P", "P-00041")` → `"P-00042"`.
 * Les préfixes restent alignés sur l'application desktop (`P-` pour les
 * dossiers patients, `FAC-` pour les factures, `DEV-` pour les devis).
 */
export function nextNumber(
  prefix: string,
  lastValue: string | null | undefined,
  pad = 5,
): string {
  const parsed = lastValue
    ? Number.parseInt(lastValue.replace(/\D/g, ""), 10)
    : 0;
  const next = (Number.isFinite(parsed) ? parsed : 0) + 1;
  return `${prefix}-${String(next).padStart(pad, "0")}`;
}

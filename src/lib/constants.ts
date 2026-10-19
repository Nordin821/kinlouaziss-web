/** Constantes générales de l'application. */
export const APP_NAME = "KinLouaziss";
export const APP_SHORT_TITLE = "KinLouaziss";
export const APP_TAGLINE = "Gestion de cabinet de kinésithérapie";

/** Devise par défaut (modifiable depuis les paramètres). */
export const DEFAULT_CURRENCY_CODE = "MAD";
export const DEFAULT_CURRENCY_SYMBOL = "DH";
export const DEFAULT_LOCALE = "fr-FR";

/** Chemins des routes, alignés sur l'application desktop. */
export const ROUTES = {
  login: "/connexion",
  dashboard: "/tableau-de-bord",
  patients: "/patients",
  medicalRecords: "/dossiers-medicaux",
  appointments: "/rendez-vous",
  sessions: "/seances",
  exercises: "/exercices",
  payments: "/paiements",
  invoices: "/factures",
  quotes: "/devis",
  reports: "/rapports",
  users: "/utilisateurs",
  settings: "/parametres",
  backup: "/sauvegarde",
  /** Page personnelle, atteinte depuis le menu du compte (hors menu principal). */
  account: "/mon-compte",
  /**
   * Choix d'un nouveau mot de passe après réinitialisation par un
   * administrateur. Route hors des groupes `(auth)` et `(app)` : l'utilisateur
   * est connecté, mais le shell de l'application lui est fermé tant qu'il n'a
   * pas choisi son propre mot de passe.
   */
  passwordReset: "/mot-de-passe-reinitialisation",
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Construit le chemin d'un dossier patient. */
export function patientPath(patientId: number | string): string {
  return `${ROUTES.patients}/${patientId}`;
}

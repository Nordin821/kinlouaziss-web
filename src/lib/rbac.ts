/**
 * Rôles et permissions de l'application web.
 *
 * Trois rôles, alignés sur l'application desktop :
 * - `admin`        : accès complet, gestion des utilisateurs et paramètres ;
 * - `therapist`    : accès clinique (patients, dossiers, séances, agenda) ;
 * - `receptionist` : accueil, agenda et encaissements.
 */

export const ROLES = {
  admin: "admin",
  therapist: "therapist",
  receptionist: "receptionist",
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin: "Administrateur",
  therapist: "Thérapeute",
  receptionist: "Réceptionniste",
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  admin: "Accès complet à toutes les fonctionnalités du cabinet.",
  therapist: "Gestion des patients, dossiers médicaux, séances et exercices.",
  receptionist: "Accueil, prise de rendez-vous, facturation et encaissement.",
};

export function isRoleCode(value: string): value is RoleCode {
  return (Object.values(ROLES) as string[]).includes(value);
}

export function roleLabel(value: string): string {
  return isRoleCode(value) ? ROLE_LABELS[value] : value;
}

/** Catalogue des permissions, par catégorie fonctionnelle. */
export const PERMISSIONS: ReadonlyArray<{
  code: string;
  label: string;
  category: string;
}> = [
  { code: "patients.view", label: "Consulter les patients", category: "Patients" },
  { code: "patients.manage", label: "Créer et modifier les patients", category: "Patients" },
  { code: "records.view", label: "Consulter les dossiers médicaux", category: "Dossiers médicaux" },
  { code: "records.manage", label: "Modifier les dossiers médicaux", category: "Dossiers médicaux" },
  { code: "appointments.view", label: "Consulter l'agenda", category: "Agenda" },
  { code: "appointments.manage", label: "Planifier les rendez-vous", category: "Agenda" },
  { code: "sessions.view", label: "Consulter les séances", category: "Séances" },
  { code: "sessions.manage", label: "Enregistrer les séances", category: "Séances" },
  { code: "exercises.view", label: "Consulter les exercices", category: "Exercices" },
  { code: "exercises.manage", label: "Gérer les exercices", category: "Exercices" },
  { code: "payments.view", label: "Consulter les paiements", category: "Finance" },
  { code: "payments.manage", label: "Enregistrer les paiements", category: "Finance" },
  { code: "invoices.view", label: "Consulter les factures", category: "Finance" },
  { code: "invoices.manage", label: "Émettre des factures", category: "Finance" },
  { code: "quotes.view", label: "Consulter les devis", category: "Finance" },
  { code: "quotes.manage", label: "Émettre des devis", category: "Finance" },
  { code: "reports.view", label: "Consulter les rapports", category: "Rapports" },
  { code: "users.view", label: "Consulter les utilisateurs", category: "Administration" },
  { code: "users.manage", label: "Gérer les utilisateurs et rôles", category: "Administration" },
  { code: "settings.manage", label: "Modifier les paramètres du cabinet", category: "Administration" },
  { code: "backup.manage", label: "Gérer les sauvegardes", category: "Administration" },
];

const ALL = PERMISSIONS.map((permission) => permission.code);

/** Permissions accordées à chaque rôle. */
export const ROLE_PERMISSIONS: Record<RoleCode, string[]> = {
  admin: [...ALL],
  therapist: [
    "patients.view",
    "patients.manage",
    "records.view",
    "records.manage",
    "appointments.view",
    "appointments.manage",
    "sessions.view",
    "sessions.manage",
    "exercises.view",
    "exercises.manage",
    "payments.view",
    "invoices.view",
    "quotes.view",
    "reports.view",
  ],
  receptionist: [
    "patients.view",
    "patients.manage",
    "appointments.view",
    "appointments.manage",
    "payments.view",
    "payments.manage",
    "invoices.view",
    "invoices.manage",
    "quotes.view",
    "quotes.manage",
  ],
};

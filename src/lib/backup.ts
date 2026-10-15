import { prisma } from "@/lib/prisma";

/** Une table exportable, avec son libellé affiché. */
export type BackupEntity = {
  key: string;
  label: string;
  load: () => Promise<unknown[]>;
};

/**
 * Registre des tables exportables.
 *
 * L'ordre suit celui du schéma afin que l'import manuel d'une sauvegarde
 * respecte les dépendances de clés étrangères.
 */
export const BACKUP_ENTITIES: BackupEntity[] = [
  { key: "roles", label: "Rôles", load: () => prisma.role.findMany() },
  {
    key: "permissions",
    label: "Permissions",
    load: () => prisma.permission.findMany(),
  },
  {
    key: "rolePermissions",
    label: "Permissions par rôle",
    load: () => prisma.rolePermission.findMany(),
  },
  {
    key: "appUsers",
    label: "Utilisateurs",
    load: () => prisma.appUser.findMany(),
  },
  {
    key: "therapists",
    label: "Thérapeutes",
    load: () => prisma.therapist.findMany(),
  },
  { key: "patients", label: "Patients", load: () => prisma.patient.findMany() },
  {
    key: "medicalRecords",
    label: "Dossiers médicaux",
    load: () => prisma.medicalRecord.findMany(),
  },
  {
    key: "medicalHistories",
    label: "Antécédents médicaux",
    load: () => prisma.medicalHistory.findMany(),
  },
  {
    key: "assessments",
    label: "Bilans",
    load: () => prisma.assessment.findMany(),
  },
  {
    key: "treatmentGoals",
    label: "Objectifs de traitement",
    load: () => prisma.treatmentGoal.findMany(),
  },
  {
    key: "treatmentPlans",
    label: "Plans de traitement",
    load: () => prisma.treatmentPlan.findMany(),
  },
  {
    key: "patientDocuments",
    label: "Documents patients",
    load: () => prisma.patientDocument.findMany(),
  },
  {
    key: "appointments",
    label: "Rendez-vous",
    load: () => prisma.appointment.findMany(),
  },
  { key: "sessions", label: "Séances", load: () => prisma.session.findMany() },
  {
    key: "sessionProgress",
    label: "Progrès de séance",
    load: () => prisma.sessionProgress.findMany(),
  },
  {
    key: "exercises",
    label: "Exercices",
    load: () => prisma.exercise.findMany(),
  },
  {
    key: "sessionExercises",
    label: "Exercices de séance",
    load: () => prisma.sessionExercise.findMany(),
  },
  {
    key: "payments",
    label: "Paiements",
    load: () => prisma.payment.findMany(),
  },
  { key: "invoices", label: "Factures", load: () => prisma.invoice.findMany() },
  {
    key: "invoiceItems",
    label: "Lignes de facture",
    load: () => prisma.invoiceItem.findMany(),
  },
  { key: "quotes", label: "Devis", load: () => prisma.quote.findMany() },
  {
    key: "quoteItems",
    label: "Lignes de devis",
    load: () => prisma.quoteItem.findMany(),
  },
  {
    key: "clinicSettings",
    label: "Paramètres",
    load: () => prisma.clinicSetting.findMany(),
  },
  {
    key: "auditLogs",
    label: "Journal d'activité",
    load: () => prisma.auditLog.findMany(),
  },
];

/** Retrouve une table exportable par sa clé. */
export function findEntity(key: string): BackupEntity | undefined {
  return BACKUP_ENTITIES.find((entity) => entity.key === key);
}

/** Sérialise une valeur pour un export JSON ou CSV. */
export function serializeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return JSON.stringify(value);
}

/** Construit un CSV (point-virgule, BOM UTF-8) à partir de lignes plates. */
export function toCsv(rows: Record<string, unknown>[]): string {
  const columns = [
    ...new Set(rows.flatMap((row) => Object.keys(row))),
  ];
  if (columns.length === 0) return "\uFEFF";

  const escape = (value: string | number | boolean | null): string => {
    const text = value === null ? "" : String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = columns.map(escape).join(";");
  const body = rows.map((row) =>
    columns.map((column) => escape(serializeValue(row[column]))).join(";"),
  );

  return `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
}

/**
 * Enregistre une entrée d'historique de sauvegarde.
 *
 * N'échoue jamais l'export : une erreur d'écriture est ignorée.
 */
export async function recordBackup(
  fileName: string,
  sizeBytes: number,
  kind: string,
): Promise<void> {
  await prisma.backup
    .create({
      data: {
        fileName,
        filePath: "téléchargement navigateur",
        sizeBytes,
        kind,
      },
    })
    .catch(() => undefined);
}

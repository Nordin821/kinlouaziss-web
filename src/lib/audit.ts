import { prisma } from "@/lib/prisma";

export type AuditActor = {
  id: string;
  fullName: string;
};

/**
 * Journalise une action métier dans `audit_logs`.
 *
 * N'échoue jamais l'action appelante : une erreur d'écriture du journal est
 * silencieusement ignorée (le journal est un confort, pas une contrainte).
 */
export async function logAudit(
  actor: AuditActor,
  action: string,
  entity: string,
  entityId: string | number,
  details?: string,
): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        userId: actor.id,
        userName: actor.fullName,
        action,
        entity,
        entityId: String(entityId),
        details,
      },
    })
    .catch(() => undefined);
}

"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export type BackupActionState = { ok: true } | { error: string } | undefined;

/** Retire une entrée de l'historique de sauvegarde. */
export async function deleteBackup(
  backupId: number,
): Promise<BackupActionState> {
  const user = await requireUser();
  if (!userHasPermission(user, "backup.manage")) {
    return { error: "Action non autorisée." };
  }

  try {
    await prisma.backup.delete({ where: { id: backupId } });
    await logAudit(user, "backup.delete", "backup", backupId);
    revalidatePath(ROUTES.backup);
    return { ok: true };
  } catch {
    return { error: "Impossible de supprimer cette entrée." };
  }
}

/** Vide l'historique de sauvegarde (ne supprime aucun fichier exporté). */
export async function clearBackupHistory(): Promise<BackupActionState> {
  const user = await requireUser();
  if (!userHasPermission(user, "backup.manage")) {
    return { error: "Action non autorisée." };
  }

  try {
    const result = await prisma.backup.deleteMany();
    await logAudit(
      user,
      "backup.clear",
      "backup",
      "history",
      `${result.count} entrée(s)`,
    );
    revalidatePath(ROUTES.backup);
    return { ok: true };
  } catch {
    return { error: "Impossible de vider l'historique." };
  }
}

import { NextResponse } from "next/server";

import {
  BACKUP_ENTITIES,
  findEntity,
  recordBackup,
  toCsv,
} from "@/lib/backup";
import { requirePermission } from "@/lib/dal";

function stamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/**
 * Export des données du cabinet.
 *
 * - `?format=json` (défaut) : sauvegarde complète de toutes les tables ;
 * - `?format=csv&entity=<clé>` : export CSV d'une seule table.
 */
export async function GET(request: Request): Promise<Response> {
  await requirePermission("backup.manage");

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const entityKey = url.searchParams.get("entity");

  if (format === "csv") {
    const entity = entityKey ? findEntity(entityKey) : undefined;
    if (!entity) {
      return new NextResponse("Table inconnue.", { status: 400 });
    }

    const rows = (await entity.load()) as Record<string, unknown>[];
    const csv = toCsv(rows);
    const fileName = `${entity.key}-${stamp()}.csv`;

    await recordBackup(fileName, Buffer.byteLength(csv, "utf8"), "csv");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const payload: Record<string, unknown> = {
    application: "KinLouaziss",
    exportedAt: new Date().toISOString(),
    entities: {} as Record<string, unknown[]>,
  };

  for (const entity of BACKUP_ENTITIES) {
    (payload.entities as Record<string, unknown[]>)[entity.key] =
      await entity.load();
  }

  const json = JSON.stringify(payload, null, 2);
  const fileName = `kinlouaziss-sauvegarde-${stamp()}.json`;

  await recordBackup(fileName, Buffer.byteLength(json, "utf8"), "full");

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

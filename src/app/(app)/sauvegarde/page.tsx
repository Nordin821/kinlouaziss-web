import {
  DatabaseBackup,
  Download,
  FileJson,
  Info,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RefreshButton } from "@/components/ui/refresh-button";
import { BACKUP_ENTITIES } from "@/lib/backup";
import { requirePermission } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";

import { BackupHistory, type BackupRow } from "./backup-history";

export const metadata = { title: "Sauvegarde" };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export default async function BackupPage() {
  await requirePermission("backup.manage");

  const [backups, settings] = await Promise.all([
    prisma.backup.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    loadSettings(),
  ]);

  const rows: BackupRow[] = backups.map((backup) => ({
    id: backup.id,
    fileName: backup.fileName,
    kind: backup.kind,
    sizeLabel: formatSize(backup.sizeBytes),
    dateLabel: formatDateTime(backup.createdAt),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sauvegarde"
        description="Exportez les données du cabinet pour les archiver hors ligne."
        actions={<RefreshButton />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 p-5 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
              <FileJson className="size-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Sauvegarde complète</h2>
              <p className="text-sm text-muted-foreground">
                Téléchargez l&apos;intégralité des tables (patients, dossiers,
                séances, agenda, finances, paramètres) dans un fichier JSON
                horodaté. Conservez-le dans un lieu sûr.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="h-auto w-full whitespace-normal py-2 text-center sm:w-auto"
          >
            <a href="/sauvegarde/export?format=json" download>
              <Download />
              Télécharger la sauvegarde complète
            </a>
          </Button>
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-success" />
            <h2 className="text-base font-semibold">Base hébergée Supabase</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Les données vivent dans une base PostgreSQL Supabase sauvegardée
            automatiquement par l&apos;hébergeur.
          </p>
          <p className="text-sm text-muted-foreground">
            Les exports ci-dessous sont des copies de sécurité
            supplémentaires : ils ne remplacent pas les sauvegardes de la base.
          </p>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <DatabaseBackup className="size-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Exports par table (CSV)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Utile pour ouvrir une table précise dans un tableur (Excel,
          LibreOffice). Le séparateur est le point-virgule.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BACKUP_ENTITIES.map((entity) => (
            <a
              key={entity.key}
              href={`/sauvegarde/export?format=csv&entity=${entity.key}`}
              download
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
            >
              <span className="font-medium">{entity.label}</span>
              <Download className="size-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      </Card>

      <Card className="flex items-start gap-3 border-info/40 bg-info-soft/40 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p className="text-sm text-muted-foreground">
          La restauration d&apos;une sauvegarde s&apos;effectue côté base de
          données (import SQL/JSON par un administrateur Supabase). Veillez à
          vérifier une sauvegarde avant toute opération sensible. Dossier
          d&apos;archivage conseillé :{" "}
          {settings.values.backup_folder?.trim() || "non défini dans les paramètres"}.
        </p>
      </Card>

      <BackupHistory backups={rows} />
    </div>
  );
}

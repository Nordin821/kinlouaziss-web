"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { clearBackupHistory, deleteBackup } from "@/app/actions/backups";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type BackupRow = {
  id: number;
  fileName: string;
  kind: string;
  sizeLabel: string;
  dateLabel: string;
};

const KIND_LABELS: Record<string, string> = {
  full: "Sauvegarde complète (JSON)",
  csv: "Export CSV",
  manual: "Manuelle",
  auto: "Automatique",
};

export function BackupHistory({ backups }: { backups: BackupRow[] }) {
  const [pending, startTransition] = useTransition();

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteBackup(id);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Entrée supprimée.");
    });
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearBackupHistory();
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Historique vidé.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Historique des exports</h2>
        {backups.length > 0 ? (
          <ConfirmDialog
            title="Vider l'historique"
            description="Cette action retire les entrées de la liste. Les fichiers déjà téléchargés ne sont pas affectés."
            confirmLabel="Vider"
            destructive
            onConfirm={handleClear}
            trigger={
              <Button variant="outline" size="sm" disabled={pending}>
                <Trash2 />
                Vider
              </Button>
            }
          />
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fichier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Taille</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.length === 0 ? (
              <TableEmpty colSpan={5}>
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun export enregistré. Utilisez les boutons ci-dessus pour
                  télécharger une sauvegarde.
                </p>
              </TableEmpty>
            ) : (
              backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-mono text-xs">
                    {backup.fileName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {KIND_LABELS[backup.kind] ?? backup.kind}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {backup.sizeLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {backup.dateLabel}
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmDialog
                      title="Supprimer l'entrée"
                      description={`${backup.fileName} sera retiré de l'historique.`}
                      confirmLabel="Supprimer"
                      destructive
                      onConfirm={() => handleDelete(backup.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer l'entrée"
                          disabled={pending}
                          className="text-danger"
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

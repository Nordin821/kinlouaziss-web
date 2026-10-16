"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  archivePatient,
  deletePatient,
  restorePatient,
} from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/lib/constants";

/**
 * Actions secondaires de la fiche patient : archiver / réactiver / supprimer.
 *
 * Équivalent web du menu d'actions du dossier patient de l'application desktop.
 */
export function PatientRecordActions({
  patientId,
  status,
  patientName,
}: {
  patientId: number;
  status: string;
  patientName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      const result = await archivePatient(patientId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Patient archivé.");
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restorePatient(patientId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Patient réactivé.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePatient(patientId);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Patient déplacé dans la corbeille.");
      router.push(ROUTES.patients);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Autres actions"
          disabled={pending}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "archived" ? (
          <DropdownMenuItem disabled={pending} onSelect={() => handleRestore()}>
            <ArchiveRestore />
            Réactiver
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={pending} onSelect={() => handleArchive()}>
            <Archive />
            Archiver
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <ConfirmDialog
          title="Supprimer le patient"
          description={`Le patient ${patientName} sera déplacé dans la corbeille. Il pourra être réactivé par la suite.`}
          confirmLabel="Supprimer"
          destructive
          onConfirm={handleDelete}
          trigger={
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Trash2 />
              Supprimer
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

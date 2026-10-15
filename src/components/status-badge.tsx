import { cn } from "@/lib/utils";
import { badgeVariants } from "@/components/ui/badge";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const TONES: Record<string, Tone> = {
  active: "success",
  inactive: "neutral",
  archived: "neutral",
  planned: "info",
  confirmed: "primary",
  completed: "success",
  cancelled: "danger",
  no_show: "warning",
  unpaid: "warning",
  partial: "info",
  paid: "success",
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "danger",
  expired: "neutral",
  pending: "warning",
};

const LABELS: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  archived: "Archivé",
  planned: "Planifié",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
  unpaid: "Impayée",
  partial: "Partiel",
  paid: "Payée",
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  pending: "En attente",
};

/** Badge de statut : traduit un code technique en libellé et couleur. */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = TONES[status] ?? "neutral";
  const label = LABELS[status] ?? status;
  return (
    <span className={cn(badgeVariants({ variant: tone }), className)}>
      {label}
    </span>
  );
}

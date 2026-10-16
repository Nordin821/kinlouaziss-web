"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { clearLogo, saveLogo } from "@/app/actions/settings";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

/**
 * Import / suppression du logo du cabinet.
 *
 * Équivalent des actions « Choisir un fichier », « Remplacer » et « Retirer »
 * de l'application desktop ; l'image est envoyée au serveur qui la stocke.
 */
export function LogoSection({ hasCustomLogo }: { hasCustomLogo: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);

    startTransition(async () => {
      const result = await saveLogo(formData);
      if (result && "error" in result) toast.error(result.error);
      else {
        toast.success("Logo mis à jour.");
        router.refresh();
      }
    });
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearLogo();
      if (result && "error" in result) toast.error(result.error);
      else {
        toast.success("Logo par défaut rétabli.");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo"
            alt="Logo du cabinet"
            className="size-12 object-contain"
          />
        </span>
        <div className="text-sm">
          <p className="font-medium">Logo du cabinet</p>
          <p className="text-muted-foreground">
            {hasCustomLogo
              ? "Logo personnalisé utilisé sur la barre latérale et les documents."
              : "Logo par défaut utilisé. Formats acceptés : PNG, JPEG, WebP, SVG, GIF (300 Ko max)."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          id="clinic-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <label
          htmlFor="clinic-logo"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "cursor-pointer",
            pending && "pointer-events-none opacity-50",
          )}
        >
          <Upload />
          {hasCustomLogo ? "Remplacer le logo" : "Choisir un fichier"}
        </label>

        {hasCustomLogo ? (
          <ConfirmDialog
            title="Retirer le logo"
            description="Le logo par défaut de KinLouaziss sera de nouveau utilisé."
            confirmLabel="Retirer"
            destructive
            onConfirm={handleClear}
            trigger={
              <Button variant="outline" disabled={pending} className="text-danger">
                <Trash2 />
                Retirer
              </Button>
            }
          />
        ) : null}
      </div>
    </div>
  );
}

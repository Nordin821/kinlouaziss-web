"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { resetUserPassword } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Copie une valeur dans le presse-papiers, avec repli.
 *
 * `navigator.clipboard` est refusé hors contexte sécurisé ou sans permission —
 * cas fréquent sur un poste partagé du cabinet. `execCommand` reste le chemin
 * universel, même s'il est déprécié : il vaut mieux un bouton qui marche qu'un
 * message d'erreur.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
}

/**
 * Réinitialisation du mot de passe d'un utilisateur par un administrateur.
 *
 * Deux écrans successifs : la confirmation, puis le mot de passe provisoire —
 * affiché **une seule fois**, transmis par l'administrateur, et remplacé par le
 * collègue à sa prochaine connexion (`mustChangePassword`).
 */
export function ResetPasswordDialog({
  user,
  disabled,
  trigger,
}: {
  user: { id: string; fullName: string };
  disabled?: boolean;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [temporary, setTemporary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleReset() {
    setPending(true);
    try {
      const result = await resetUserPassword(user.id);

      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }

      if (result && "temporaryPassword" in result) {
        setTemporary(result.temporaryPassword);
        // Le badge de dernière connexion / statut n'est pas affecté, mais le
        // rendu serveur doit reprendre la nouvelle valeur de mustChangePassword.
        router.refresh();
      }
    } catch {
      toast.error("La réinitialisation a échoué. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!temporary) return;

    const copied = await copyToClipboard(temporary);

    if (copied) {
      setCopied(true);
      toast.success("Mot de passe provisoire copié.");
    } else {
      toast.error(
        "La copie a échoué. Sélectionnez le mot de passe à la main.",
      );
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Rien de sensible ne survit à la fermeture.
      setTemporary(null);
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {temporary
              ? "Mot de passe provisoire généré"
              : "Réinitialiser le mot de passe"}
          </DialogTitle>
          <DialogDescription>
            {temporary ? (
              <>
                Transmettez ce code à {user.fullName}. Il devra le remplacer par
                son propre mot de passe à sa prochaine connexion.
              </>
            ) : (
              <>
                Un mot de passe provisoire sera généré pour {user.fullName}. Il
                devra en choisir un nouveau dès sa prochaine connexion.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {temporary ? (
          <div className="space-y-3">
            <code
              className={cn(
                "block select-all rounded-lg border border-primary/30 bg-primary-soft px-3 py-3 text-center",
                "font-mono text-lg tracking-widest text-primary-soft-foreground",
              )}
            >
              {temporary}
            </code>
            <p className="text-xs text-muted-foreground">
              Ce mot de passe n&apos;est plus affichable après fermeture de cette
              fenêtre.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {temporary ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={copied}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copié" : "Copier"}
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Fermer
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleReset}
                disabled={pending || disabled}
              >
                <KeyRound />
                {pending ? "Génération…" : "Réinitialiser"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

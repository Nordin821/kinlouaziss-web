"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Save } from "lucide-react";
import { toast } from "sonner";

import {
  changeAccountPassword,
  updateAccountProfile,
} from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type ActionResult = { ok: true } | { error: string } | undefined;

/**
 * Soumission commune aux deux formulaires : état d'attente, message d'erreur,
 * notification et rafraîchissement du rendu serveur (l'en-tête affiche le nom
 * de l'utilisateur, il doit suivre).
 */
function useAccountAction(
  action: (formData: FormData) => Promise<ActionResult>,
  successMessage: string,
) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData): Promise<boolean> {
    setError(null);
    setPending(true);
    try {
      const result = await action(formData);
      if (result && "error" in result) {
        setError(result.error);
        toast.error(result.error);
        return false;
      }
      toast.success(successMessage);
      router.refresh();
      return true;
    } catch {
      const message = "Une erreur est survenue. Réessayez.";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setPending(false);
    }
  }

  return { submit, pending, error };
}

/** Message d'erreur affiché en pied de formulaire. */
function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
    >
      {error}
    </p>
  );
}

/** Champ mot de passe avec bascule d'affichage. */
function PasswordInput({
  id,
  name,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  autoComplete: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function ProfileForm({
  fullName,
  phone,
  email,
  roleLabel,
}: {
  fullName: string;
  phone: string;
  email: string;
  roleLabel: string;
}) {
  const { submit, pending, error } = useAccountAction(
    updateAccountProfile,
    "Profil enregistré.",
  );

  async function handleSubmit(formData: FormData): Promise<void> {
    await submit(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet" htmlFor="fullName" required>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={fullName}
            maxLength={120}
            required
          />
        </Field>

        <Field
          label="Téléphone"
          htmlFor="phone"
          hint="Facultatif, affiché dans les documents du cabinet."
        >
          <Input id="phone" name="phone" defaultValue={phone} maxLength={30} />
        </Field>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium">Adresse e-mail</span>
          <p className="text-sm text-foreground">{email}</p>
          <p className="text-xs text-muted-foreground">
            Identifiant de connexion : modifiable par un administrateur.
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium">Rôle</span>
          <p className="text-sm text-foreground">{roleLabel}</p>
          <p className="text-xs text-muted-foreground">
            Attribué par un administrateur.
          </p>
        </div>
      </div>

      <FormError error={error} />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save />
          {pending ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const { submit, pending, error } = useAccountAction(
    changeAccountPassword,
    "Mot de passe modifié.",
  );

  async function handleSubmit(formData: FormData): Promise<void> {
    const ok = await submit(formData);
    // Les champs sensibles sont vidés après un changement réussi.
    if (ok) formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <Field label="Mot de passe actuel" htmlFor="currentPassword" required>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
        />
      </Field>

      <Field
        label="Nouveau mot de passe"
        htmlFor="newPassword"
        required
        hint="Au moins 8 caractères."
      >
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>

      <Field label="Confirmer le nouveau mot de passe" htmlFor="confirmPassword" required>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </Field>

      <FormError error={error} />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <KeyRound />
          {pending ? "Modification…" : "Changer mon mot de passe"}
        </Button>
      </div>
    </form>
  );
}

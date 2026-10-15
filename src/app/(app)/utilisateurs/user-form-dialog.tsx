"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createUser, updateUser } from "@/app/actions/users";
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
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, ROLE_LABELS, type RoleCode } from "@/lib/rbac";

export type UserFormData = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  roleCode: string;
  isActive: boolean;
};

const roleCodes: RoleCode[] = [ROLES.admin, ROLES.therapist, ROLES.receptionist];

export function UserFormDialog({
  user,
  trigger,
}: {
  user?: UserFormData;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = Boolean(user?.id);
  const action = isEdit ? updateUser.bind(null, user!.id) : createUser;

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await action(formData);
      if (result && "error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(isEdit ? "Utilisateur mis à jour." : "Compte créé.");
        router.refresh();
      }
    } catch {
      const message = "Une erreur est survenue. Réessayez.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setError(null);
      formRef.current?.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour le rôle, le statut ou le mot de passe du compte."
              : "Créez un compte de connexion pour un membre de l'équipe du cabinet."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet" htmlFor="fullName" required className="sm:col-span-2">
              <Input
                id="fullName"
                name="fullName"
                defaultValue={user?.fullName ?? ""}
                placeholder="Ex. Salma Benali"
                required
              />
            </Field>

            <Field
              label="Adresse e-mail"
              htmlFor="email"
              required={!isEdit}
              hint={isEdit ? "L'adresse e-mail ne peut pas être modifiée." : undefined}
              className="sm:col-span-2"
            >
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email ?? ""}
                placeholder="salma.benali@cabinet.ma"
                required={!isEdit}
                readOnly={isEdit}
                disabled={isEdit}
              />
            </Field>

            <Field label="Téléphone" htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                defaultValue={user?.phone ?? ""}
                placeholder="06 12 34 56 78"
              />
            </Field>

            <Field label="Rôle" htmlFor="roleCode" required>
              <Select name="roleCode" defaultValue={user?.roleCode ?? ROLES.therapist}>
                <SelectTrigger id="roleCode">
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roleCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {ROLE_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {isEdit ? (
              <Field label="Statut du compte" htmlFor="status">
                <Select
                  name="status"
                  defaultValue={user?.isActive ? "active" : "inactive"}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            <Field
              label="Mot de passe"
              htmlFor="password"
              required={!isEdit}
              hint={
                isEdit
                  ? "Laissez vide pour conserver le mot de passe actuel."
                  : "8 caractères minimum."
              }
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isEdit ? "new-password" : "new-password"}
                placeholder={isEdit ? "••••••••" : ""}
                required={!isEdit}
              />
            </Field>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le compte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useTransition } from "react";
import { KeyRound, MoreHorizontal, Pencil, Plus, Trash2, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";

import { deleteUser, setUserActive } from "@/app/actions/users";
import { Avatar } from "@/components/ui/avatar";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type RoleCode } from "@/lib/rbac";

import { UserFormDialog, type UserFormData } from "./user-form-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

export type UserRow = UserFormData & {
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_TONE: Record<RoleCode, "info" | "primary" | "neutral"> = {
  admin: "info",
  therapist: "primary",
  receptionist: "neutral",
};

function RoleBadge({ roleCode }: { roleCode: string }) {
  const tone = (ROLE_TONE as Record<string, "info" | "primary" | "neutral">)[
    roleCode
  ] ?? "neutral";
  return (
    <span className={cn(badgeVariants({ variant: tone }))}>
      {ROLE_LABELS[roleCode as RoleCode] ?? roleCode}
    </span>
  );
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleToggle(user: UserRow) {
    startTransition(async () => {
      const result = await setUserActive(user.id, !user.isActive);
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          user.isActive ? "Compte désactivé." : "Compte activé.",
        );
      }
    });
  }

  async function handleDelete(user: UserRow) {
    const result = await deleteUser(user.id);
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Compte supprimé.");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Dernière connexion</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="w-12 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableEmpty colSpan={6}>
              <EmptyState
                icon={Users}
                title="Aucun utilisateur"
                description="Créez un compte pour les thérapeutes et le personnel d'accueil."
              />
            </TableEmpty>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.fullName} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {user.fullName}
                          {isSelf ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (vous)
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.email}
                          {user.phone ? ` · ${user.phone}` : ""}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge roleCode={user.roleCode} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        badgeVariants({
                          variant: user.isActive ? "success" : "neutral",
                        }),
                      )}
                    >
                      {user.isActive ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Jamais"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <UserFormDialog
                          user={user}
                          trigger={
                            <DropdownMenuItem
                              disabled={pending}
                              onSelect={(event) => event.preventDefault()}
                            >
                              <Pencil />
                              Modifier
                            </DropdownMenuItem>
                          }
                        />
                        <ResetPasswordDialog
                          user={user}
                          disabled={pending || isSelf}
                          trigger={
                            <DropdownMenuItem
                              disabled={pending || isSelf}
                              onSelect={(event) => event.preventDefault()}
                            >
                              <KeyRound />
                              Réinitialiser le mot de passe
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem
                          disabled={pending || isSelf}
                          onSelect={() => handleToggle(user)}
                        >
                          {user.isActive ? <UserX /> : <UserCheck />}
                          {user.isActive ? "Désactiver" : "Activer"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <ConfirmDialog
                          title="Supprimer l'utilisateur"
                          description={`Le compte de ${user.fullName} et son accès seront définitivement supprimés. Cette action est irréversible.`}
                          confirmLabel="Supprimer"
                          destructive
                          onConfirm={() => handleDelete(user)}
                          trigger={
                            <DropdownMenuItem
                              disabled={pending || isSelf}
                              onSelect={(event) => event.preventDefault()}
                              className="text-danger focus:text-danger"
                            >
                              <Trash2 />
                              Supprimer
                            </DropdownMenuItem>
                          }
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function NewUserButton() {
  return (
    <UserFormDialog
      trigger={
        <Button>
          <Plus />
          Nouvel utilisateur
        </Button>
      }
    />
  );
}

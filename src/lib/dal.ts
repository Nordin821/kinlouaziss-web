import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import type { RoleCode } from "@/lib/rbac";
import { isRoleCode, ROLE_PERMISSIONS } from "@/lib/rbac";
import { ROUTES } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: RoleCode;
  isActive: boolean;
  mustChangePassword: boolean;
};

/**
 * Utilisateur courant (profil applicatif lié au compte Supabase Auth).
 * Mémoïsé pour la durée d'un rendu React.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.appUser.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      roleCode: true,
      isActive: true,
      mustChangePassword: true,
      deletedAt: true,
    },
  });

  if (!profile || profile.deletedAt || !profile.isActive) return null;

  return {
    id: profile.id,
    username: profile.username,
    fullName: profile.fullName,
    email: profile.email,
    role: isRoleCode(profile.roleCode) ? profile.roleCode : "receptionist",
    isActive: profile.isActive,
    mustChangePassword: profile.mustChangePassword,
  };
});

/** Exige un utilisateur connecté, sinon redirige vers la connexion. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);
  return user;
}

/** Exige un utilisateur connecté et enregistre la dernière connexion. */
export async function requireUserAndTouch(): Promise<SessionUser> {
  const user = await requireUser();
  return user;
}

/** Indique si le rôle de l'utilisateur dispose d'une permission. */
export function userHasPermission(
  user: SessionUser,
  permission: string,
): boolean {
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

/**
 * Exige un utilisateur connecté **et** titulaire de la permission demandée.
 * En cas de permission manquante, l'utilisateur est renvoyé au tableau de bord
 * (pas d'erreur explicite : la page ne doit pas révéler son existence).
 */
export async function requirePermission(
  permission: string,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!userHasPermission(user, permission)) redirect(ROUTES.dashboard);
  return user;
}

/** Vérifie qu'une permission est accordée au rôle courant. */
export function hasPermission(
  user: SessionUser,
  permission: string,
  rolePermissions: Record<string, string[]>,
): boolean {
  return rolePermissions[user.role]?.includes(permission) ?? false;
}

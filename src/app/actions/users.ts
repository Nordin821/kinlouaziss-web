"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";
import { requireUser, userHasPermission } from "@/lib/dal";
import { ROLES } from "@/lib/rbac";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateValues,
  type UserUpdateValues,
} from "@/lib/validations/user";

export type UserActionState = { ok: true } | { error: string } | undefined;

const SERVICE_ROLE_ERROR =
  "La gestion des comptes est indisponible : la clé SUPABASE_SERVICE_ROLE_KEY " +
  "n'est pas configurée sur le serveur.";

/** Vérifie que l'utilisateur courant peut gérer les comptes. */
async function guard(): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!userHasPermission(user, "users.manage")) {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }
  return { ok: true, id: user.id, name: user.fullName };
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function logAudit(
  userId: string,
  userName: string,
  action: string,
  entityId: string,
  details?: string,
): Promise<void> {
  await prisma.auditLog
    .create({
      data: { userId, userName, action, entity: "user", entityId, details },
    })
    .catch(() => undefined);
}

/** Nombre d'administrateurs actifs (garde-fou contre le verrouillage total). */
function countActiveAdmins(): Promise<number> {
  return prisma.appUser.count({
    where: { roleCode: ROLES.admin, isActive: true, deletedAt: null },
  });
}

/** Construit un identifiant unique à partir de l'adresse e-mail. */
async function uniqueUsername(email: string): Promise<string> {
  const base =
    (email.split("@")[0] ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 40) || "utilisateur";

  let candidate = base;
  let suffix = 1;
  while (
    await prisma.appUser.findUnique({
      where: { username: candidate },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

function extractCreateValues(formData: FormData): UserCreateValues {
  const raw = Object.fromEntries(formData.entries());
  return userCreateSchema.parse({
    fullName: raw.fullName ?? "",
    email: String(raw.email ?? "").trim().toLowerCase(),
    phone: raw.phone ?? "",
    roleCode: raw.roleCode,
    password: raw.password ?? "",
  });
}

function extractUpdateValues(formData: FormData): UserUpdateValues {
  const raw = Object.fromEntries(formData.entries());
  return userUpdateSchema.parse({
    fullName: raw.fullName ?? "",
    phone: raw.phone ?? "",
    roleCode: raw.roleCode,
    status: raw.status || "active",
    password: raw.password ?? "",
  });
}

/** Crée un compte Supabase Auth puis le profil applicatif associé. */
export async function createUser(
  formData: FormData,
): Promise<UserActionState> {
  const auth = await guard();
  if (!auth.ok) return { error: auth.error };

  if (!isServiceRoleConfigured()) return { error: SERVICE_ROLE_ERROR };

  let values: UserCreateValues;
  try {
    values = extractCreateValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const existing = await prisma.appUser.findFirst({
    where: { email: values.email, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { error: "Un compte existe déjà avec cette adresse e-mail." };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: { full_name: values.fullName },
  });

  if (error || !data.user) {
    return {
      error: /already|exists|registered/i.test(error?.message ?? "")
        ? "Un compte existe déjà avec cette adresse e-mail."
        : "La création du compte a échoué. Réessayez.",
    };
  }

  const userId = data.user.id;

  try {
    const username = await uniqueUsername(values.email);
    await prisma.appUser.create({
      data: {
        id: userId,
        username,
        fullName: values.fullName,
        email: values.email,
        phone: emptyToNull(values.phone),
        roleCode: values.roleCode,
        isActive: true,
      },
    });
  } catch {
    // Profil impossible à créer : on annule le compte Auth pour rester cohérent.
    await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
    return { error: "Impossible d'enregistrer le profil. Réessayez." };
  }

  await logAudit(
    auth.id,
    auth.name,
    "user.create",
    userId,
    `${values.fullName} (${values.email})`,
  );

  revalidatePath(ROUTES.users);
  return { ok: true };
}

/** Met à jour un profil, son rôle, son statut et éventuellement son mot de passe. */
export async function updateUser(
  userId: string,
  formData: FormData,
): Promise<UserActionState> {
  const auth = await guard();
  if (!auth.ok) return { error: auth.error };

  let values: UserUpdateValues;
  try {
    values = extractUpdateValues(formData);
  } catch {
    return { error: "Veuillez vérifier les champs du formulaire." };
  }

  const target = await prisma.appUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      roleCode: true,
      isActive: true,
      fullName: true,
      email: true,
      deletedAt: true,
    },
  });
  if (!target || target.deletedAt) {
    return { error: "Utilisateur introuvable." };
  }

  const isSelf = target.id === auth.id;
  const demotingSelf = isSelf && values.roleCode !== ROLES.admin;
  if (demotingSelf) {
    return { error: "Vous ne pouvez pas modifier votre propre rôle." };
  }
  if (isSelf && values.status === "inactive") {
    return { error: "Vous ne pouvez pas désactiver votre propre compte." };
  }

  const losesAdmin =
    target.roleCode === ROLES.admin &&
    (values.roleCode !== ROLES.admin || values.status === "inactive");
  if (losesAdmin && (await countActiveAdmins()) <= 1) {
    return { error: "Le cabinet doit conserver au moins un administrateur actif." };
  }

  if (values.password) {
    if (!isServiceRoleConfigured()) return { error: SERVICE_ROLE_ERROR };
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: values.password,
    });
    if (error) return { error: "Le changement de mot de passe a échoué." };
  }

  try {
    await prisma.appUser.update({
      where: { id: userId },
      data: {
        fullName: values.fullName,
        phone: emptyToNull(values.phone),
        roleCode: values.roleCode,
        isActive: values.status === "active",
        mustChangePassword: values.password ? false : undefined,
      },
    });
  } catch {
    return { error: "Impossible de mettre à jour l'utilisateur." };
  }

  await logAudit(auth.id, auth.name, "user.update", userId, target.email ?? undefined);

  revalidatePath(ROUTES.users);
  return { ok: true };
}

/** Active ou désactive un compte (le compte Auth est banni en conséquence). */
export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<UserActionState> {
  const auth = await guard();
  if (!auth.ok) return { error: auth.error };

  if (userId === auth.id) {
    return { error: "Vous ne pouvez pas désactiver votre propre compte." };
  }

  const target = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { id: true, roleCode: true, fullName: true, email: true },
  });
  if (!target) return { error: "Utilisateur introuvable." };

  if (!isActive && target.roleCode === ROLES.admin) {
    if ((await countActiveAdmins()) <= 1) {
      return { error: "Le cabinet doit conserver au moins un administrateur actif." };
    }
  }

  try {
    await prisma.appUser.update({
      where: { id: userId },
      data: { isActive },
    });
  } catch {
    return { error: "Impossible de modifier le statut du compte." };
  }

  // Renfort côté Supabase Auth : un compte désactivé ne peut plus se connecter.
  if (isServiceRoleConfigured()) {
    const supabase = createAdminClient();
    await supabase.auth.admin
      .updateUserById(userId, { ban_duration: isActive ? "none" : "876000h" })
      .catch(() => undefined);
  }

  await logAudit(
    auth.id,
    auth.name,
    isActive ? "user.activate" : "user.deactivate",
    userId,
    target.email ?? target.fullName,
  );

  revalidatePath(ROUTES.users);
  return { ok: true };
}

/** Supprime définitivement un compte (profil + compte Supabase Auth). */
export async function deleteUser(userId: string): Promise<UserActionState> {
  const auth = await guard();
  if (!auth.ok) return { error: auth.error };

  if (userId === auth.id) {
    return { error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  const target = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { id: true, roleCode: true, fullName: true, email: true },
  });
  if (!target) return { error: "Utilisateur introuvable." };

  if (target.roleCode === ROLES.admin && (await countActiveAdmins()) <= 1) {
    return { error: "Le cabinet doit conserver au moins un administrateur actif." };
  }

  await logAudit(
    auth.id,
    auth.name,
    "user.delete",
    userId,
    `${target.fullName} (${target.email ?? "sans e-mail"})`,
  );

  try {
    await prisma.appUser.delete({ where: { id: userId } });
  } catch {
    return { error: "Impossible de supprimer l'utilisateur." };
  }

  if (isServiceRoleConfigured()) {
    const supabase = createAdminClient();
    await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
  }

  revalidatePath(ROUTES.users);
  return { ok: true };
}

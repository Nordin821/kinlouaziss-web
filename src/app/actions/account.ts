"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { ZodError } from "zod";

import { logAudit } from "@/lib/audit";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import {
  accountPasswordSchema,
  accountProfileSchema,
} from "@/lib/validations/account";

export type AccountActionState = { ok: true } | { error: string } | undefined;

/** Premier message de validation, dans l'ordre de déclaration du schéma. */
function firstMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Veuillez vérifier le formulaire.";
}

/**
 * Met à jour le profil de l'utilisateur connecté (nom, téléphone).
 *
 * Chacun ne peut modifier que **son propre** profil : l'identifiant vient de la
 * session, jamais du formulaire.
 */
export async function updateAccountProfile(
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();

  const parsed = accountProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? undefined,
  });

  if (!parsed.success) {
    return { error: firstMessage(parsed.error) };
  }

  const phone = parsed.data.phone ? parsed.data.phone : null;

  await prisma.appUser.update({
    where: { id: user.id },
    data: { fullName: parsed.data.fullName, phone },
  });

  // Le nom est dupliqué dans les métadonnées Supabase Auth : on les aligne
  // pour que les deux sources ne divergent pas.
  const supabase = await createSessionClient();
  await supabase.auth
    .updateUser({ data: { full_name: parsed.data.fullName } })
    .catch(() => undefined);

  await logAudit(user, "update", "account", user.id, "Profil mis à jour");

  revalidatePath(ROUTES.account);
  return { ok: true };
}

/**
 * Change le mot de passe de l'utilisateur connecté.
 *
 * Le mot de passe actuel est vérifié sur un client Supabase **isolé** (aucune
 * session persistée) : cela évite de toucher à la session courante.
 *
 * La modification, en revanche, est appliquée sur la **session de
 * l'utilisateur** (celle des cookies). C'est indispensable : Supabase révoque
 * toutes les *autres* sessions dès qu'un mot de passe change. En passant par un
 * client isolé, la session courante serait comptée parmi les « autres » et
 * l'utilisateur serait déconnecté aussitôt. En passant par sa propre session,
 * c'est elle qui survit — et les autres appareils sont déconnectés, ce qui est
 * le comportement souhaité.
 */
export async function changeAccountPassword(
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();

  const parsed = accountPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: firstMessage(parsed.error) };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      error:
        "L'authentification n'est pas configurée sur le serveur : " +
        "le mot de passe ne peut pas être modifié.",
    };
  }

  if (!user.email) {
    return {
      error:
        "Aucune adresse e-mail n'est associée à ce compte. Demandez à un " +
        "administrateur de réinitialiser votre mot de passe.",
    };
  }

  const isolated = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Le mot de passe actuel authentifie réellement l'utilisateur.
  const { error: verifyError } = await isolated.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return { error: "Le mot de passe actuel est incorrect." };
  }

  // 2) Le nouveau mot de passe est appliqué sur la session de l'utilisateur :
  //    c'est elle qui doit survivre à la révocation des autres sessions.
  const supabase = await createSessionClient();
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return {
      error: `Le mot de passe n'a pas pu être modifié : ${updateError.message}`,
    };
  }

  await prisma.appUser
    .update({ where: { id: user.id }, data: { mustChangePassword: false } })
    .catch(() => undefined);

  await logAudit(user, "update", "account", user.id, "Mot de passe modifié");

  revalidatePath(ROUTES.account);
  return { ok: true };
}

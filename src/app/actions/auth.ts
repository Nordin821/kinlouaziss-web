"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

/** Connexion par e-mail et mot de passe (Supabase Auth). */
export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Adresse e-mail ou mot de passe invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Adresse e-mail ou mot de passe incorrect." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await prisma.appUser.findUnique({
      where: { id: user.id },
      select: { isActive: true, deletedAt: true },
    });

    // Compte désactivé ou supprimé : on refuse la session applicative.
    if (!profile || profile.deletedAt || !profile.isActive) {
      await supabase.auth.signOut();
      return {
        error:
          "Ce compte est désactivé. Contactez un administrateur du cabinet.",
      };
    }

    await prisma.appUser
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => undefined);
  }

  const target =
    parsed.data.next && parsed.data.next.startsWith("/")
      ? parsed.data.next
      : ROUTES.dashboard;

  redirect(target);
}

/** Déconnexion et retour à la page de connexion. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.login);
}

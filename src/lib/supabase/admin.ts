import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Client Supabase disposant de la clé `service_role`.
 *
 * ⚠ Ce client contourne le Row Level Security et permet d'administrer les
 * comptes (`auth.admin.*`). Il ne doit **jamais** être importé depuis un
 * composant client : la clé resterait alors exposée au navigateur.
 */
export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL);
}

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || !SUPABASE_URL) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant : " +
        "la gestion des comptes est indisponible.",
    );
  }

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

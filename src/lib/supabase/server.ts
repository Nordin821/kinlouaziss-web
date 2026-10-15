import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Client Supabase côté serveur (Server Components, Server Actions,
 * Route Handlers). La session est lue/écrite dans les cookies via l'API
 * `cookies()` de Next.js 16 (asynchrone).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Appelée depuis un Server Component en lecture seule : ignorée,
          // le rafraîchissement de session est assuré par `src/proxy.ts`.
        }
      },
    },
  });
}

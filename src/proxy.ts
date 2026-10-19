import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/proxy";

/** Routes accessibles sans authentification. */
const PUBLIC_ROUTES: string[] = [
  "/",
  "/installation",
  ROUTES.login,
  /* Logo du cabinet et manifeste d'installation : ressources de marque
     publiques, sans donnée patient (sinon un visiteur anonyme — donc un
     téléphone qui ouvre l'écran de connexion — est redirigé vers la page
     de connexion et l'image/le manifeste casse). */
  "/logo",
  "/manifest.json",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Proxy Next.js 16 (anciennement « middleware ») : rafraîchit la session
 * Supabase et redirige les visiteurs non connectés vers la page de connexion.
 *
 * Les contrôles d'autorisation fins restent effectués dans la couche
 * d'accès aux données (`src/lib/dal.ts`), au plus près des données.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sans configuration Supabase, l'application affiche l'écran d'installation.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const { response, user } = await updateSession(request);

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.search = pathname === ROUTES.dashboard ? "" : `?suivant=${pathname}`;
    return NextResponse.redirect(url);
  }

  if (user && (pathname === ROUTES.login || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.dashboard;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     * - les fichiers internes de Next.js (_next/static, _next/image)
     * - les ressources statiques (images, favicon…)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

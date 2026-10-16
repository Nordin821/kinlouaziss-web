import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Logo utilisé lorsqu'aucun logo personnalisé n'a été importé. */
const DEFAULT_LOGO = "/kinlouaziss_logo.png";
const LOGO_KEY = "clinic_logo";

/**
 * Sert le logo du cabinet (`/logo`).
 *
 * Le logo personnalisé est stocké en base sous forme de data URL : la route le
 * renvoie avec son type MIME d'origine. À défaut, elle redirige vers le logo par
 * défaut livré dans `public/`.
 */
export async function GET(): Promise<Response> {
  const row = await prisma.clinicSetting.findUnique({
    where: { key: LOGO_KEY },
    select: { value: true },
  });

  const stored = row?.value?.trim() ?? "";
  const match = /^data:(image\/[\w.+-]+);base64,([\s\S]+)$/.exec(stored);

  if (!match) {
    return new Response(null, {
      status: 307,
      headers: { Location: DEFAULT_LOGO, "Cache-Control": "no-store" },
    });
  }

  const body = Buffer.from(match[2], "base64");

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": match[1],
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}

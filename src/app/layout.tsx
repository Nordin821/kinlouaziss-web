import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  /* « Ajouter à l'écran d'accueil » : sur iPhone comme sur Android, le
     manifeste permet l'installation (WebAPK) et l'ouverture en plein écran. */
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
};

/* Android (Chrome) colore sa barre d'adresse avec `themeColor`, et assombrit
   automatiquement les sites qui ne se déclarent pas clairs — ici l'identité
   KinLouaziss est volontairement claire, on refuse cet assombrissement. */
export const viewport: Viewport = {
  themeColor: "#1b6e8f",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  );
}

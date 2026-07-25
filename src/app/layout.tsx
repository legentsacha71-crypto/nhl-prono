import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google";
import "./globals.css";
import AppSplash from "@/components/AppSplash";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Police impactante façon tableau d'affichage sportif, utilisée uniquement
// pour le gros chiffre de points dans l'onglet "Stats" du profil.
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "La Nuit Hockey",
  description: "Pronostics de scores de hockey entre amis",
};

// viewport-fit=cover est nécessaire pour que env(safe-area-inset-top/bottom)
// retourne les vraies valeurs sur iOS (sinon TopBar/BottomNav se collent
// sous l'encoche / l'île dynamique et par-dessus la barre système).
//
// maximumScale=1 + userScalable=false : sans ça, Safari/WKWebView zoome
// automatiquement l'écran quand on tape dans un champ texte (comportement
// natif du navigateur pour les champs avec une police < 16px), et ce zoom
// ne se réinitialise pas toujours après avoir quitté le champ. On désactive
// le zoom pour se comporter comme une vraie appli native (cohérent avec le
// wrapper Capacitor), plutôt que de devoir passer tous les champs en 16px.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppSplash />
        {children}
      </body>
    </html>
  );
}

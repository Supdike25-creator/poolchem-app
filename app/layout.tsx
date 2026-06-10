import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import ButtonSoundEffects from "../components/ButtonSoundEffects";
import NavigationLoadingListener from "../components/NavigationLoadingListener";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import ThemeManager from "../components/ThemeManager";
import VersionBadge from "../components/VersionBadge";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChemDeck",
  description: "Role-based pool chemistry supervision and guard logging",
  applicationName: "ChemDeck",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ChemDeck",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#0891b2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className={`${dmSans.className} min-h-full w-full flex flex-col bg-slate-50 text-slate-950`}>
        <ThemeManager />
        <ServiceWorkerRegister />
        <ButtonSoundEffects />
        <NavigationLoadingListener />
        {children}
        <VersionBadge />
      </body>
    </html>
  );
}

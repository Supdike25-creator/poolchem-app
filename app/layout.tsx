import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import ButtonSoundEffects from "../components/ButtonSoundEffects";
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
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/chemdeck-mark.svg",
  },
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
    >
      <body className={`${dmSans.className} min-h-full w-full flex flex-col bg-slate-50 text-slate-950`}>
        <ThemeManager />
        <ButtonSoundEffects />
        {children}
        <VersionBadge />
      </body>
    </html>
  );
}

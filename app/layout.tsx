import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ButtonSoundEffects from "../components/ButtonSoundEffects";
import ThemeManager from "../components/ThemeManager";
import VersionBadge from "../components/VersionBadge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChemDeck",
  description: "Role-based pool chemistry supervision and guard logging",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${geistSans.className} min-h-full flex flex-col bg-slate-50 text-slate-950`}>
        <ThemeManager />
        <ButtonSoundEffects />
        {children}
        <VersionBadge />
      </body>
    </html>
  );
}

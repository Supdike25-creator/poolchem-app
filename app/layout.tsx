import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ButtonSoundEffects from "../components/ButtonSoundEffects";
import ThemeManager from "../components/ThemeManager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body className="min-h-full flex flex-col">
        <ThemeManager />
        <ButtonSoundEffects />
        {children}
      </body>
    </html>
  );
}

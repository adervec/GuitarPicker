import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { AppShell } from "@/widgets/app-shell/ui/AppShell";
import "./globals.css";
import "./play-engine.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "GuitarPicker (FSD/Next/RQ pilot)",
  description: "Feature-Sliced Design + Next.js + TanStack Query pilot, migrating GuitarPicker's Tuner and Play off the vanilla-JS app.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <div id="toast-host" />
      </body>
    </html>
  );
}

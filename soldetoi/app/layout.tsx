import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { police } from "@/lib/police";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Soldetoi — Vois où part ton argent", template: "%s — Soldetoi" },
  description:
    "Envoie ton relevé. Soldetoi te montre où part ton argent et te donne un plan pour mettre de côté.",
  applicationName: "Soldetoi",
  icons: { icon: "/icone.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F1E7",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className={police.className}>{children}</body>
    </html>
  );
}

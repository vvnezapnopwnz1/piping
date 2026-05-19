import type { Metadata } from "next";

import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import {
  Geist_Mono,
  Inter as V0_Font_Inter,
  Geist_Mono as V0_Font_Geist_Mono,
  Source_Serif_4 as V0_Font_Source_Serif_4,
} from "next/font/google";

import { RoleProvider } from "@/contexts/role-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/pipeqc/sidebar-nav";
import { TopNav } from "@/components/pipeqc/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { IsoWatcherMount } from "@/components/iso-watcher-mount";
import { SpoolRFTWatcherMount } from "@/components/spool-rft-watcher-mount";

// Initialize fonts
const _inter = V0_Font_Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});
const _geistMono = V0_Font_Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});
const _sourceSerif_4 = V0_Font_Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "PipeQC - Industrial Piping Quality Control",
  description:
    "Industrial piping construction management and quality control system",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <RoleProvider>
          <SidebarProvider>
            <SidebarNav />
            <SidebarInset>
              <TopNav />
              <main className="flex-1 overflow-auto p-2">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </RoleProvider>
        <Toaster richColors position="top-right" />
        <IsoWatcherMount />
        <SpoolRFTWatcherMount />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}

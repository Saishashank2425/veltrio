import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veltrio — AI commerce, with explicit policy checks.",
  description:
    "Veltrio is a prototype for AI commerce authorization. Explore product research, spending mandate drafts, and a deterministic gateway demo with explicit decision outcomes.",
  openGraph: {
    title: "Veltrio",
    description: "Commerce moves. You stay in control.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", inter.variable, "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-navy text-ivory">
        {children}
      </body>
    </html>
  );
}

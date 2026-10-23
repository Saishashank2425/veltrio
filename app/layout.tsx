import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veltrio — Commerce moves. You stay in control.",
  description:
    "Veltrio is a deterministic AI authorization gateway that checks every agent purchase against your approved spending rules before it executes.",
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
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-navy text-ivory">
        {children}
      </body>
    </html>
  );
}

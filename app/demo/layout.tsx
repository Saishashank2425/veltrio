import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veltrio Demo — Try the Authorization Gateway",
  description:
    "Submit a purchase proposal as an AI agent and watch the Veltrio gateway apply your spending rules deterministically.",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

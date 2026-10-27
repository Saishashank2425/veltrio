import type { Metadata } from "next";
import MandatesClient from "@/components/mandates/MandatesClient";

export const metadata: Metadata = {
  title: "Spending Mandates | Veltrio",
  description: "Turn natural-language purchase instructions into structured, reviewable spending mandates.",
};

export default function MandatesPage() {
  return <MandatesClient />;
}

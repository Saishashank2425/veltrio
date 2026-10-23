import type { Metadata } from "next";
import FinanceClient from "@/components/finance/FinanceClient";

export const metadata: Metadata = {
  title: "Personal Finance Dashboard | Veltrio",
  description: "Track transactions, subscriptions, credit cards, EMIs and upcoming bills in one place.",
};

export default function FinancePage() {
  return <FinanceClient />;
}

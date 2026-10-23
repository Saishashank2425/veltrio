import type { Metadata } from "next";
import AgentHub from "@/components/agents/AgentHub";

export const metadata: Metadata = {
  title: "Agent Hub | Veltrio",
  description: "Create agents, manage tools, and work through tasks with explicit approval.",
};

export default function AgentsPage() {
  return <AgentHub />;
}

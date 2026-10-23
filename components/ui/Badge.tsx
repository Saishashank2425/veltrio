import { cn } from "@/lib/utils";

type BadgeVariant = "approved" | "blocked" | "pending" | "neutral";

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

const badgeConfig: Record<BadgeVariant, { dot: string; bg: string; text: string; label: string }> = {
  approved: {
    dot: "bg-approved",
    bg: "bg-approved-bg",
    text: "text-approved",
    label: "Approved",
  },
  blocked: {
    dot: "bg-blocked",
    bg: "bg-blocked-bg",
    text: "text-blocked",
    label: "Blocked",
  },
  pending: {
    dot: "bg-pending",
    bg: "bg-pending-bg",
    text: "text-pending",
    label: "Pending",
  },
  neutral: {
    dot: "bg-slate-light",
    bg: "bg-mist",
    text: "text-slate",
    label: "—",
  },
};

export function Badge({ variant, label, className }: BadgeProps) {
  const config = badgeConfig[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {label ?? config.label}
    </span>
  );
}

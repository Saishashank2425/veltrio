import { cn } from "@/lib/utils";

interface RuleCardProps {
  category: string;
  description: string;
  limit: string;
  period: string;
  used?: string;
  usedPercent?: number;
  className?: string;
}

export function RuleCard({
  category,
  description,
  limit,
  period,
  used,
  usedPercent = 0,
  className,
}: RuleCardProps) {
  const barColor =
    usedPercent >= 90
      ? "bg-blocked"
      : usedPercent >= 70
      ? "bg-pending"
      : "bg-approved";

  return (
    <div
      className={cn(
        "p-4 rounded-lg border border-ivory/10 bg-navy-mid/60 space-y-3",
        "hover:border-gold/20 transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-gold/70 mb-0.5">
            {category}
          </p>
          <p className="text-sm font-medium text-ivory leading-snug">{description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-ivory">{limit}</p>
          <p className="text-xs text-ivory/40">{period}</p>
        </div>
      </div>

      {used !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-ivory/40">
            <span>Used: {used}</span>
            <span>{usedPercent}%</span>
          </div>
          <div className="h-1 rounded-full bg-ivory/10 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", barColor)}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

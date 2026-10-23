import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StepCardProps {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function StepCard({ step, icon: Icon, title, description, className }: StepCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-5 p-7 sm:p-8",
        "border border-ivory/10 rounded-2xl bg-gradient-to-br from-navy-mid/75 to-navy-deep/55 shadow-lg shadow-black/10",
        "hover:-translate-y-1 hover:border-gold/35 hover:shadow-xl hover:shadow-black/20 transition-all duration-300",
        className
      )}
    >
      {/* Step number */}
      <div className="flex items-center gap-3">
        <span
          className="w-8 h-8 rounded-full border border-gold/40 flex items-center justify-center
                     text-xs font-bold text-gold shrink-0"
        >
          {step}
        </span>
        <Icon className="w-5 h-5 text-gold/70" strokeWidth={1.5} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-ivory mb-2">{title}</h3>
        <p className="text-ivory/60 text-sm leading-relaxed">{description}</p>
      </div>

      {/* Connector line on desktop (not last) */}
      <div
        aria-hidden
        className="hidden lg:block absolute top-1/2 -right-px w-px h-12 bg-gradient-to-b
                   from-transparent via-gold/20 to-transparent -translate-y-1/2"
      />
    </div>
  );
}

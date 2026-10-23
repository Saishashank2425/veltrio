import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  light?: boolean;
}

export function SectionLabel({ children, className, light }: SectionLabelProps) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4",
        light ? "text-gold" : "text-gold/80",
        className
      )}
    >
      {children}
    </span>
  );
}

import { cn } from "@capstone/ui";

type BadgeVariant = "default" | "gold" | "success" | "warning" | "danger" | "info" | "outline";

interface PremiumBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/8 text-foreground border-white/10",
  gold: "bg-gold-muted text-gold border-gold/30",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  danger: "bg-red-500/10 text-red-400 border-red-500/25",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  outline: "bg-transparent text-muted-foreground border-border",
};

export function PremiumBadge({ children, variant = "default", className, pulse }: PremiumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        variants[variant],
        pulse && "pulse-dot",
        className
      )}
    >
      {children}
    </span>
  );
}

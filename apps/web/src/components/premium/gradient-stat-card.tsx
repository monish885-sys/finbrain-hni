import { cn } from "@capstone/ui";

type GradientVariant = "primary" | "gold" | "emerald" | "dark";

interface GradientStatCardProps {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  variant?: GradientVariant;
  icon?: React.ReactNode;
  className?: string;
}

const variants: Record<GradientVariant, string> = {
  primary: "stat-gradient-primary text-white",
  gold: "stat-gradient-gold text-white",
  emerald: "stat-gradient-emerald text-white",
  dark: "stat-gradient-dark text-foreground",
};

export function GradientStatCard({
  label,
  value,
  sublabel,
  variant = "dark",
  icon,
  className,
}: GradientStatCardProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 md:p-6 transition-transform hover:scale-[1.01]",
        variants[variant],
        className
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-wider",
              isDark ? "text-muted-foreground" : "text-white/70"
            )}
          >
            {label}
          </p>
          {icon}
        </div>
        <div className="mt-2 font-display text-3xl md:text-4xl font-semibold tabular-nums tracking-tight">
          {value}
        </div>
        {sublabel && (
          <div
            className={cn(
              "mt-2 text-sm flex items-center gap-1.5",
              isDark ? "text-muted-foreground" : "text-white/80"
            )}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

import { cn } from "./utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "gold" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-capstone-surface-elevated text-capstone-muted border-capstone-border",
  success: "bg-emerald-950/50 text-emerald-400 border-emerald-800",
  warning: "bg-amber-950/50 text-amber-400 border-amber-800",
  danger: "bg-red-950/50 text-red-400 border-red-800",
  gold: "bg-amber-950/30 text-capstone-gold border-amber-700/50",
  info: "bg-blue-950/50 text-blue-400 border-blue-800",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusChipProps {
  status: "clean" | "attention" | "critical" | "pending";
  label: string;
  sublabel?: string;
}

const statusConfig = {
  clean: { variant: "success" as const, dot: "bg-emerald-400" },
  attention: { variant: "warning" as const, dot: "bg-amber-400" },
  critical: { variant: "danger" as const, dot: "bg-red-400" },
  pending: { variant: "gold" as const, dot: "bg-capstone-gold" },
};

export function StatusChip({ status, label, sublabel }: StatusChipProps) {
  const config = statusConfig[status];
  return (
    <div className="flex items-center gap-3 rounded-lg bg-capstone-surface border border-capstone-border px-4 py-3">
      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", config.dot)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-capstone-text">{label}</p>
        {sublabel && <p className="text-xs text-capstone-muted truncate">{sublabel}</p>}
      </div>
    </div>
  );
}

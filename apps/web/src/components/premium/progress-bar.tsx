import { cn } from "@capstone/ui";

interface ProgressBarProps {
  value: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
  label?: string;
  rightLabel?: string;
}

export function ProgressBar({
  value,
  className,
  barClassName,
  showLabel,
  label,
  rightLabel,
}: ProgressBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {(showLabel || label || rightLabel) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-foreground font-medium">{label}</span>}
          {rightLabel && <span className="text-muted-foreground tabular-nums">{rightLabel}</span>}
        </div>
      )}
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple transition-all duration-700",
            barClassName
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

interface SegmentedProgressProps {
  segments: Array<{ label: string; value: number; color: string }>;
}

export function SegmentedProgress({ segments }: SegmentedProgressProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <div className="space-y-4">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-white/5">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={cn("h-full transition-all", seg.color)}
            style={{ width: `${(seg.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", seg.color)} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="text-foreground font-medium ml-auto tabular-nums">{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

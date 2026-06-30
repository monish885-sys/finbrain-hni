import { formatINR } from "./utils";
import { cn } from "./utils";

interface MetricProps {
  label: string;
  value: number;
  compact?: boolean;
  delta?: number;
  className?: string;
  valueClassName?: string;
}

export function Metric({ label, value, compact = true, delta, className, valueClassName }: MetricProps) {
  return (
    <div className={cn(className)}>
      <p className="text-xs font-medium text-capstone-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-2xl font-semibold text-capstone-text tabular-nums", valueClassName)}>
        {formatINR(value, { compact })}
      </p>
      {delta !== undefined && (
        <p className={cn("text-sm mt-0.5 tabular-nums", delta >= 0 ? "text-emerald-400" : "text-red-400")}>
          {formatINR(delta, { compact: true, showSign: true })} today
        </p>
      )}
    </div>
  );
}

interface ProgressBarProps {
  segments: Array<{ label: string; value: number; color: string }>;
  className?: string;
}

export function ProgressBar({ segments, className }: ProgressBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-3 rounded-full overflow-hidden bg-capstone-surface-elevated">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={cn("h-full transition-all", seg.color)}
            style={{ width: `${(seg.value / total) * 100}%` }}
            title={`${seg.label}: ${seg.value}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs text-capstone-muted">
            <span className={cn("h-2 w-2 rounded-full shrink-0", seg.color)} />
            <span>
              {seg.label} {seg.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

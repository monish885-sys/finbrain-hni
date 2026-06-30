import { cn } from "@capstone/ui";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, icon, badge, className }: PageHeaderProps) {
  return (
    <div className={cn("animate-fade-up", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold mb-2">{eyebrow}</p>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground tracking-tight flex items-center gap-3">
            {icon}
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {badge}
      </div>
    </div>
  );
}

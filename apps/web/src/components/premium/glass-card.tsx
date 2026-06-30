import { cn } from "@capstone/ui";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  solid?: boolean;
  shimmer?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5 md:p-6",
  lg: "p-6 md:p-8",
};

export function GlassCard({
  children,
  className,
  solid = false,
  shimmer = false,
  padding = "md",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        solid ? "glass-card-solid" : "glass-card",
        shimmer && "shimmer-border",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassCardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function GlassCardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("font-display text-lg font-semibold text-foreground", className)}>{children}</h3>
  );
}

export function GlassCardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("text-sm text-muted-foreground mt-0.5", className)}>{children}</p>;
}

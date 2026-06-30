import { cn } from "./utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "bordered";
}

export function Card({ children, className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5",
        variant === "default" && "bg-capstone-surface border border-capstone-border",
        variant === "elevated" && "bg-capstone-surface-elevated shadow-lg shadow-black/20",
        variant === "bordered" && "bg-transparent border border-capstone-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-medium text-capstone-muted uppercase tracking-wider", className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>;
}

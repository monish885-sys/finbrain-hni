import { cn } from "./utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const variants = {
  primary: "bg-capstone-accent text-white hover:bg-capstone-accent/90",
  secondary: "bg-capstone-surface-elevated text-capstone-text border border-capstone-border hover:bg-capstone-border/50",
  ghost: "text-capstone-muted hover:text-capstone-text hover:bg-capstone-surface",
  gold: "bg-capstone-gold/10 text-capstone-gold border border-capstone-gold/30 hover:bg-capstone-gold/20",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capstone-accent",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

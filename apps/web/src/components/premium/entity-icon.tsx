import { cn } from "@capstone/ui";
import {
  Users,
  Building2,
  Briefcase,
  Home,
  type LucideIcon,
} from "lucide-react";

const entityConfig: Record<string, { icon: LucideIcon; gradient: string }> = {
  individual: { icon: Users, gradient: "from-blue-500 to-indigo-600" },
  huf: { icon: Building2, gradient: "from-violet-500 to-purple-600" },
  private_trust: { icon: Briefcase, gradient: "from-emerald-500 to-teal-600" },
  pvt_ltd: { icon: Home, gradient: "from-amber-500 to-orange-600" },
  joint: { icon: Users, gradient: "from-pink-500 to-rose-600" },
};

interface EntityIconProps {
  type: string;
  className?: string;
}

export function EntityIcon({ type, className }: EntityIconProps) {
  const config = entityConfig[type] ?? entityConfig.individual;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
        config.gradient,
        className
      )}
    >
      <Icon className="h-4 w-4 text-white" />
    </div>
  );
}

export function getEntityGradient(type: string): string {
  return entityConfig[type]?.gradient ?? entityConfig.individual.gradient;
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format INR with Indian numbering (lakhs/crores).
 * @param paise - amount in paise (1/100 rupee) or pass rupees with paise=false
 */
export function formatINR(
  amount: number,
  options: {
    compact?: boolean;
    showSign?: boolean;
    paise?: boolean;
  } = {}
): string {
  const { compact = false, showSign = false, paise = false } = options;
  const rupees = paise ? amount / 100 : amount;
  const sign = showSign && rupees > 0 ? "+" : rupees < 0 ? "-" : "";
  const abs = Math.abs(rupees);

  if (compact) {
    if (abs >= 1_00_00_000) {
      const cr = abs / 1_00_00_000;
      return `${sign}₹${cr.toFixed(1)} Cr`;
    }
    if (abs >= 1_00_000) {
      const lakhs = abs / 1_00_000;
      return `${sign}₹${lakhs.toFixed(1)}L`;
    }
    if (abs >= 1_000) {
      return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    }
    return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

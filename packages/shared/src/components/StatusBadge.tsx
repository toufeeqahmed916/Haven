import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function StatusBadge({ tone = "neutral", className = "", ...props }: StatusBadgeProps) {
  return <span className={`haven-status haven-status--${tone} ${className}`.trim()} {...props} />;
}

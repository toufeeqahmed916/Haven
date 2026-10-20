import type { HTMLAttributes } from "react";

type EyebrowProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "dark";
};

export function Eyebrow({ tone = "default", className = "", ...props }: EyebrowProps) {
  return <div className={`haven-eyebrow haven-eyebrow--${tone} ${className}`.trim()} {...props} />;
}

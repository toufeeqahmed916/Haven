import type { AnchorHTMLAttributes } from "react";

type BrandProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  label?: string;
};

export function Brand({ label = "haven", className = "", ...props }: BrandProps) {
  return (
    <a className={`haven-brand ${className}`.trim()} aria-label="Haven home" {...props}>
      <span className="haven-brand__mark" aria-hidden="true">h</span>
      <span>{label}</span>
    </a>
  );
}

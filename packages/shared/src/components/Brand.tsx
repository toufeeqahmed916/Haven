import type { AnchorHTMLAttributes } from "react";

type BrandProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  label?: string;
  tone?: "light" | "dark";
};

export function Brand({ label = "haven", tone = "light", className = "", ...props }: BrandProps) {
  return (
    <a className={`haven-brand ${className}`.trim()} aria-label="Haven home" {...props}>
      <img
        className="haven-brand__mark"
        src={tone === "dark" ? "/brand/haven-logo-transparent.png" : "/brand/haven-logo-rounded.png"}
        alt=""
        width="34"
        height="34"
        aria-hidden="true"
      />
      <span>{label}</span>
    </a>
  );
}

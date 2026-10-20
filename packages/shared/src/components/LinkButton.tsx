import type { AnchorHTMLAttributes } from "react";

type LinkVariant = "primary" | "dark" | "outline" | "coral" | "light";
type LinkSize = "small" | "medium";

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: LinkVariant;
  size?: LinkSize;
  fullWidth?: boolean;
};

export function LinkButton({
  variant = "primary",
  size = "medium",
  fullWidth = false,
  className = "",
  ...props
}: LinkButtonProps) {
  const classes = [
    "haven-button",
    `haven-button--${variant}`,
    `haven-button--${size}`,
    fullWidth ? "haven-button--full" : "",
    className,
  ].filter(Boolean).join(" ");

  return <a className={classes} {...props} />;
}

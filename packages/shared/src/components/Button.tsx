import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "dark" | "outline" | "coral" | "light";
type ButtonSize = "small" | "medium";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "medium",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "haven-button",
    `haven-button--${variant}`,
    `haven-button--${size}`,
    fullWidth ? "haven-button--full" : "",
    className,
  ].filter(Boolean).join(" ");

  return <button className={classes} type={type} {...props} />;
}

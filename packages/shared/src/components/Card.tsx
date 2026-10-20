import type { HTMLAttributes } from "react";

type CardTone = "white" | "paper" | "sage" | "sand" | "forest";
type CardPadding = "medium" | "large";

export type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: CardTone;
  padding?: CardPadding;
  as?: "article" | "section" | "div";
};

export function Card({
  tone = "white",
  padding = "medium",
  as: Component = "article",
  className = "",
  ...props
}: CardProps) {
  return (
    <Component
      className={`haven-card haven-card--${tone} haven-card--${padding} ${className}`.trim()}
      {...props}
    />
  );
}

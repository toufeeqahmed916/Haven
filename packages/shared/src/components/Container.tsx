import type { HTMLAttributes } from "react";

type ContainerElement = "div" | "main" | "section" | "nav" | "header" | "footer";

export type ContainerProps = HTMLAttributes<HTMLElement> & {
  as?: ContainerElement;
};

export function Container({ as: Component = "div", className = "", ...props }: ContainerProps) {
  return <Component className={`haven-container ${className}`.trim()} {...props} />;
}

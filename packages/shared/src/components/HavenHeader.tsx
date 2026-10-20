import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { Container } from "./Container";

export type NavigationItem = {
  label: string;
  href: string;
};

type HavenHeaderProps = {
  navigation: NavigationItem[];
  action?: ReactNode;
  tone?: "light" | "dark";
  productLabel?: string;
};

export function HavenHeader({ navigation, action, tone = "dark", productLabel }: HavenHeaderProps) {
  return (
    <header className={`haven-header haven-header--${tone}`}>
      <Container as="nav" className="haven-header__inner" aria-label="Primary navigation">
        <div className="haven-header__identity">
          <Brand href="#" />
          {productLabel ? <span className="haven-header__product">{productLabel}</span> : null}
        </div>
        <div className="haven-header__links">
          {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </div>
        {action ? <div className="haven-header__action">{action}</div> : null}
      </Container>
    </header>
  );
}

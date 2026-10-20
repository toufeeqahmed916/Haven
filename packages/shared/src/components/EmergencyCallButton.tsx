import type { AnchorHTMLAttributes } from "react";

type EmergencyCallButtonProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  phoneNumber: string;
  label: string;
};

export function EmergencyCallButton({ phoneNumber, label, className = "", ...props }: EmergencyCallButtonProps) {
  return (
    <a
      className={`haven-button haven-button--coral haven-emergency-link ${className}`.trim()}
      href={`tel:${phoneNumber}`}
      aria-label={`${label}. Use only when immediate help is needed.`}
      {...props}
    >
      <span className="haven-emergency-link__dot" aria-hidden="true" />
      {label}
    </a>
  );
}

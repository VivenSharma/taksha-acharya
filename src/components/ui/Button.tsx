import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-forest text-cream hover:bg-forest-deep active:bg-forest-deep disabled:bg-muted disabled:text-cream/70",
  secondary: "bg-cream text-forest border border-forest hover:bg-sage active:bg-sage-deep disabled:opacity-50",
  ghost: "bg-transparent text-ink hover:bg-cream active:bg-line-soft disabled:opacity-50",
  danger: "bg-terra text-cream hover:bg-danger active:bg-danger disabled:opacity-50",
};

const SIZE: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
  lg: "text-base px-5 py-3 rounded-xl gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center font-semibold transition-colors ${SIZE[size]} ${VARIANT[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tone = "sage" | "cream" | "gold" | "terra" | "forest" | "outline" | "ink";

const TONE: Record<Tone, string> = {
  sage: "bg-sage text-forest",
  cream: "bg-cream text-ink border border-line",
  gold: "bg-gold-soft text-forest-deep",
  terra: "bg-terra/10 text-terra",
  forest: "bg-forest text-cream",
  outline: "border border-line text-ink",
  ink: "bg-ink text-cream",
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: IconName;
  iconSize?: number;
  children?: ReactNode;
}

export function Chip({
  tone = "sage",
  icon,
  iconSize = 12,
  className = "",
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none ${TONE[tone]} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
    </span>
  );
}

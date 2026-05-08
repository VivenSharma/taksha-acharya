import type { HTMLAttributes } from "react";

type Tone = "muted" | "ink" | "forest" | "gold" | "terra" | "cream";

const TONE: Record<Tone, string> = {
  muted: "text-muted",
  ink: "text-ink",
  forest: "text-forest",
  gold: "text-gold",
  terra: "text-terra",
  cream: "text-cream",
};

const BG: Record<Tone, string> = {
  muted: "bg-line-soft text-ink",
  ink: "bg-ink text-cream",
  forest: "bg-forest text-cream",
  gold: "bg-gold-soft text-forest-deep",
  terra: "bg-terra/10 text-terra",
  cream: "bg-cream text-ink",
};

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  filled?: boolean;
}

export function Tag({ tone = "muted", filled = false, className = "", children, ...rest }: TagProps) {
  const base = "inline-flex items-center font-mono text-[10px] tracking-[0.18em] uppercase font-semibold";
  const tonal = filled ? `${BG[tone]} px-2 py-0.5 rounded` : TONE[tone];
  return (
    <span className={`${base} ${tonal} ${className}`} {...rest}>
      {children}
    </span>
  );
}

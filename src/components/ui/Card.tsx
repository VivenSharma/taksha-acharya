import type { HTMLAttributes } from "react";

type Tone = "surface" | "paper" | "cream" | "sage" | "forest" | "forestDeep";

const TONE: Record<Tone, string> = {
  surface: "bg-surface border border-line text-ink",
  paper: "bg-paper border border-line text-ink",
  cream: "bg-cream border border-line text-ink",
  sage: "bg-sage border border-sage-deep/50 text-ink",
  forest: "bg-forest text-cream border border-forest-deep",
  forestDeep: "bg-forest-deep text-cream border border-forest-deep",
};

type Padding = "none" | "sm" | "md" | "lg";
const PAD: Record<Padding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padding?: Padding;
}

export function Card({
  tone = "surface",
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-[14px] ${PAD[padding]} ${TONE[tone]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

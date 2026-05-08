import Image from "next/image";
import type { CSSProperties } from "react";

interface AvatarProps {
  size?: number;
  ring?: boolean;
  useImage?: boolean;
  className?: string;
}

export function Avatar({ size = 48, ring = true, useImage = false, className = "" }: AvatarProps) {
  if (useImage) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${ring ? "ring-2 ring-gold" : ""} ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <Image src="/brand/taksha-avatar.svg" alt="Taksha" width={size} height={size} priority />
      </div>
    );
  }

  const ringPx = Math.max(1.5, size / 28);
  const style: CSSProperties = {
    width: size,
    height: size,
    background: "radial-gradient(circle at 35% 30%, #3d6f48, var(--color-forest-deep) 75%)",
    border: ring ? `${ringPx}px solid var(--color-gold)` : "none",
    color: "var(--color-cream)",
    fontFamily: "var(--font-serif)",
    fontStyle: "italic",
    fontSize: size * 0.55,
    fontWeight: 500,
    lineHeight: 1,
    boxShadow:
      size > 60
        ? "0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 24px rgba(24,51,33,0.25)"
        : undefined,
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
      style={style}
      aria-label="Taksha"
    >
      <span style={{ transform: "translateY(-2%)" }}>T</span>
    </div>
  );
}

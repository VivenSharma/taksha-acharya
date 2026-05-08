import type { ReactNode } from "react";
import { Card } from "./Card";
import { Icon, type IconName } from "./Icon";

interface Props {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "cream" | "surface";
  className?: string;
}

/**
 * Consistent empty-state card. Use wherever a page may have nothing to show —
 * Learn with no sections, Video with no rows, Quiz ready, Progress with zero
 * activity, admin tables with zero matches. Trilingual copy is the caller's
 * responsibility.
 */
export function EmptyState({
  icon = "sparkle",
  title,
  description,
  action,
  tone = "cream",
  className = "",
}: Props) {
  return (
    <Card tone={tone} padding="lg" className={`text-center ${className}`}>
      <div className="mx-auto w-12 h-12 rounded-full bg-sage flex items-center justify-center text-forest">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="font-serif italic text-lg text-ink mt-3">{title}</h3>
      {description && (
        <p className="text-[13px] text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex items-center justify-center gap-2">{action}</div>}
    </Card>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Item {
  key: string;
  label: string;
  href?: string;
}

interface SegmentedControlProps {
  items: Item[];
  activeKey?: string;
  onChange?: (key: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedControl({
  items,
  activeKey,
  onChange,
  className = "",
  size = "md",
}: SegmentedControlProps) {
  const pathname = usePathname();
  const sizeCls =
    size === "sm"
      ? "text-[10px] tracking-[0.1em] px-2.5 py-1.5"
      : "text-[11px] tracking-[0.1em] px-3 py-2";

  const resolved =
    activeKey ??
    items.find((it) => it.href && (pathname === it.href || pathname.startsWith(it.href + "/")))?.key ??
    items[0]?.key;

  return (
    <div
      className={`inline-flex border border-line rounded-full overflow-hidden font-mono uppercase font-semibold bg-paper ${className}`}
      role="tablist"
    >
      {items.map((it) => {
        const active = it.key === resolved;
        const cls = `${sizeCls} ${active ? "bg-forest text-cream" : "text-muted hover:text-ink"} transition-colors`;
        if (it.href) {
          return (
            <Link key={it.key} href={it.href} className={cls} role="tab" aria-selected={active}>
              {it.label}
            </Link>
          );
        }
        return (
          <button
            key={it.key}
            type="button"
            className={cls}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(it.key)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

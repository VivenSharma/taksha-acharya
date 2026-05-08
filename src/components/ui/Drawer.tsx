"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  widthClass?: string;
}

/**
 * Right-side slide-over for showing row detail without leaving the list.
 * Esc to close, backdrop-click to close, body scroll locked while open.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "w-full max-w-[680px]",
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 bottom-0 ${widthClass} bg-paper shadow-2xl flex flex-col`}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="min-w-0">
            {subtitle && (
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mb-1">
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="font-serif italic text-2xl text-ink leading-tight truncate">
                {title}
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1.5 rounded-full hover:bg-cream"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

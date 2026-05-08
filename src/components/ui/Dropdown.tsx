"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  fullWidth?: boolean;
  size?: "sm" | "md";
  maxHeight?: number;
  className?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  fullWidth = false,
  size = "md",
  maxHeight = 320,
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  // Build groups preserving original order
  const grouped: Array<{ group?: string; items: DropdownOption[] }> = [];
  for (const opt of options) {
    const last = grouped[grouped.length - 1];
    if (last && last.group === opt.group) last.items.push(opt);
    else grouped.push({ group: opt.group, items: [opt] });
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // When opening, highlight the selected item
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  // Scroll the highlighted item into view
  useEffect(() => {
    if (!open || highlight < 0) return;
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
    }
  }

  const sizeCls =
    size === "sm"
      ? "text-xs px-2.5 py-1.5 rounded-full"
      : "text-sm px-3 py-2 rounded-full";

  return (
    <div className={`relative ${fullWidth ? "w-full" : ""} ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={`${sizeCls} ${fullWidth ? "w-full" : ""} bg-cream hover:bg-sage text-ink font-medium border border-line inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 ${open ? "ring-2 ring-forest/40 bg-sage" : ""}`}
      >
        <span className="flex-1 text-left truncate">
          {selected?.label ?? <span className="text-muted">{placeholder}</span>}
        </span>
        <Icon
          name="chevD"
          size={14}
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          id={listboxId}
          aria-label={ariaLabel}
          className={`absolute z-50 right-0 mt-2 bg-paper border border-line rounded-2xl shadow-lg overflow-y-auto hide-scrollbar ${fullWidth ? "w-full" : "min-w-[260px] max-w-[340px]"}`}
          style={{ maxHeight }}
        >
          {grouped.map((g, gi) => (
            <div key={gi} className={gi > 0 ? "border-t border-line" : ""}>
              {g.group && (
                <div className="sticky top-0 bg-paper px-3 pt-2.5 pb-1.5">
                  <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted font-semibold">
                    {g.group}
                  </span>
                </div>
              )}
              <ul className="py-1">
                {g.items.map((opt) => {
                  const globalIdx = options.indexOf(opt);
                  const isSelected = opt.value === value;
                  const isHighlighted = globalIdx === highlight;
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-idx={globalIdx}
                        onMouseEnter={() => setHighlight(globalIdx)}
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                          btnRef.current?.focus();
                        }}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
                          isHighlighted ? "bg-sage text-forest" : "text-ink"
                        } ${isSelected ? "font-semibold" : "font-normal"}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] leading-snug truncate">{opt.label}</div>
                          {opt.sublabel && (
                            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted mt-0.5 truncate">
                              {opt.sublabel}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Icon name="check" size={14} strokeWidth={2.5} className="text-forest shrink-0 mt-0.5" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

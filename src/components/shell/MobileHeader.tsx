"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n/labels";
import { TABS, activeTabKey } from "./tabs";
import { ModuleSelector, LangSelector } from "./Selectors";

interface Props {
  className?: string;
}

const HINT_KEY = "taksha-menu-hint-seen";

export default function MobileHeader({ className = "" }: Props) {
  const pathname = usePathname();
  const { lang, voiceEnabled, toggleVoice } = useStore();
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Coach-mark cycle — shows for 3 s, hides for 2 s, looping until the user
  // opens the menu. The "seen" flag is kept in sessionStorage, so the hint
  // returns on every fresh session (tab close/reopen, app restart) and stays
  // dismissed only for the current session after they've opened the menu.
  const cycleRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(HINT_KEY) === "1") return;
    } catch {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function tick() {
      if (cancelled) return;
      setShowHint(true);
      timer = setTimeout(() => {
        if (cancelled) return;
        setShowHint(false);
        timer = setTimeout(tick, 2000);
      }, 3000);
    }

    timer = setTimeout(tick, 1200);

    cycleRef.current = {
      cancel: () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      },
    };

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  function handleOpen() {
    setOpen(true);
    setShowHint(false);
    cycleRef.current?.cancel();
    try { sessionStorage.setItem(HINT_KEY, "1"); } catch {}
  }

  if (pathname.startsWith("/admin")) return null;

  const active = activeTabKey(pathname);
  const activeTab = TABS.find((tt) => tt.key === active);
  const currentLabel = activeTab ? t(activeTab.labelKey, lang) : "";

  return (
    <>
      <header
        className={`lg:hidden sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-line ${className}`}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label={t("home", lang)}>
            <Avatar size={32} useImage />
            <div className="leading-tight min-w-0">
              <div className="font-serif italic text-base text-ink truncate">{t("appName", lang)}</div>
              <div className="font-mono text-[8px] tracking-[0.18em] uppercase text-muted truncate">
                {currentLabel || t("carpentryMentor", lang)}
              </div>
            </div>
          </Link>
          <div className="relative">
            {showHint && (
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-2 rounded-full ring-4 ring-gold/60 animate-ping pointer-events-none"
              />
            )}
            <button
              type="button"
              onClick={handleOpen}
              aria-label={t("menu", lang)}
              aria-expanded={open}
              className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border text-sm font-semibold transition-colors ${
                showHint
                  ? "bg-forest text-cream border-forest shadow-lg"
                  : "bg-cream text-ink border-line hover:bg-sage active:bg-sage-deep"
              }`}
            >
              <Icon name="menu" size={18} strokeWidth={2} />
              <span>{t("menu", lang)}</span>
            </button>

            {showHint && (
              <div
                role="tooltip"
                onClick={handleOpen}
                className="absolute right-0 top-full mt-2 w-60 z-40 bg-forest-deep text-cream rounded-xl shadow-xl p-3 hint-fade-in cursor-pointer"
              >
                <p className="text-[12.5px] leading-snug">
                  {t("tapForMenu", lang)}
                </p>
                {/* arrow */}
                <div
                  className="absolute -top-1.5 right-6 w-3 h-3 bg-forest-deep rotate-45"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("navigation", lang)}
            className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-paper shadow-xl flex flex-col"
            style={{ paddingTop: "max(env(safe-area-inset-top), 0px)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="flex items-center gap-2.5">
                <Avatar size={28} useImage />
                <div className="leading-tight">
                  <div className="font-serif italic text-sm text-ink">{t("appName", lang)}</div>
                  <div className="font-mono text-[8px] tracking-[0.18em] uppercase text-muted">
                    {t("carpentryMentor", lang)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close", lang)}
                className="p-1.5 rounded-full hover:bg-cream"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {/* Primary nav */}
              <nav aria-label={t("navigation", lang)}>
                <Tag tone="muted" className="px-2 mb-2 block">{t("navigation", lang)}</Tag>
                <ul className="space-y-1">
                  {TABS.map((tab) => {
                    const isActive = tab.key === active;
                    return (
                      <li key={tab.key}>
                        <Link
                          href={tab.primary}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                            isActive
                              ? "bg-forest text-cream"
                              : "text-ink hover:bg-cream"
                          }`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon name={tab.icon} size={20} strokeWidth={isActive ? 2 : 1.75} />
                          <span className="text-sm font-semibold flex-1">
                            {t(tab.labelKey, lang)}
                          </span>
                          {isActive && <Icon name="check" size={14} strokeWidth={2.5} />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Settings */}
              <div className="space-y-4 border-t border-line pt-5 px-2">
                <section className="space-y-2">
                  <Tag tone="muted">{t("selectModule", lang)}</Tag>
                  <ModuleSelector variant="full" />
                </section>
                <section className="space-y-2">
                  <Tag tone="muted">{t("language", lang)}</Tag>
                  <LangSelector variant="full" />
                </section>
                <section className="space-y-2">
                  <Tag tone="muted">{t("voiceOn", lang)}</Tag>
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                      voiceEnabled
                        ? "border-forest bg-sage text-forest"
                        : "border-line bg-cream text-ink"
                    }`}
                    aria-pressed={voiceEnabled}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon name={voiceEnabled ? "speaker" : "speakerOff"} size={18} />
                      {voiceEnabled ? t("on", lang) : t("off", lang)}
                    </span>
                    <span
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        voiceEnabled ? "bg-forest" : "bg-line"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-cream shadow transform transition-transform ${
                          voiceEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                </section>
                <Link
                  href="/start"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-line bg-cream text-ink hover:bg-sage transition-colors"
                >
                  <span className="text-sm font-medium">
                    {t("fullOnboarding", lang)}
                  </span>
                  <Icon name="arrowR" size={16} />
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-line bg-cream text-ink hover:bg-sage transition-colors"
                >
                  <span className="text-sm font-medium">{t("admin", lang)}</span>
                  <Icon name="arrowR" size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

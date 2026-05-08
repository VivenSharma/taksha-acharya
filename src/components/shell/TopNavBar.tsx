"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n/labels";
import { TABS, activeTabKey } from "./tabs";
import { ModuleSelector, LangSelector } from "./Selectors";

interface Props {
  className?: string;
}

export default function TopNavBar({ className = "" }: Props) {
  const pathname = usePathname();
  const { lang } = useStore();

  if (pathname.startsWith("/admin")) return null;

  const active = activeTabKey(pathname);

  return (
    <header
      className={`hidden lg:flex sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-line ${className}`}
    >
      <div className="flex items-center justify-between gap-4 w-full max-w-7xl mx-auto px-5 py-2.5">
        {/* Left: brand only */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Home">
          <Avatar size={30} useImage />
          <div className="leading-tight hidden xl:block">
            <div className="font-serif italic text-base text-ink">Taksha Acharya</div>
            <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted">
              Carpentry Mentor
            </div>
          </div>
        </Link>

        {/* Center: tabs */}
        <nav aria-label="Primary" className="flex-1 min-w-0 overflow-x-auto hide-scrollbar">
          <ul className="flex items-center gap-0.5 bg-cream border border-line rounded-full p-0.5 w-fit mx-auto">
            {TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <li key={tab.key}>
                  <Link
                    href={tab.primary}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-forest text-cream"
                        : "text-ink hover:bg-sage"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    title={t(tab.labelKey, lang)}
                  >
                    <Icon name={tab.icon} size={15} strokeWidth={isActive ? 2 : 1.75} />
                    <span className="hidden xl:inline">{t(tab.labelKey, lang)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right: module (grows with content) followed by language (fixed). */}
        <div className="flex items-center gap-2 xl:gap-3 shrink-0">
          <ModuleSelector />
          <LangSelector />
        </div>
      </div>
    </header>
  );
}

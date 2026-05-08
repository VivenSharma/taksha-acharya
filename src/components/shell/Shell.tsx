"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TopNavBar from "./TopNavBar";
import MobileHeader from "./MobileHeader";

interface Props {
  children: ReactNode;
}

export default function Shell({ children }: Props) {
  const pathname = usePathname();
  // Chat-like pages manage their own height (thread scrolls internally,
  // composer sticks at the bottom). Other pages let main scroll normally.
  const isChatLike = pathname === "/ask" || pathname === "/apply";

  return (
    <div className="flex flex-col h-full bg-paper">
      <TopNavBar />
      <MobileHeader />
      {isChatLike ? (
        <main className="flex-1 min-h-0 flex flex-col">
          {children}
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto pb-10">
          {children}
        </main>
      )}
    </div>
  );
}

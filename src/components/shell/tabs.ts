import type { IconName } from "@/components/ui/Icon";

export type TabKey = "home" | "learn" | "quiz" | "video" | "ask" | "apply" | "me";

export interface TabDef {
  key: TabKey;
  labelKey: "home" | "learn" | "quiz" | "video" | "ask" | "apply" | "progress";
  icon: IconName;
  primary: string;
  routes: string[];
}

export const TABS: TabDef[] = [
  { key: "home",  labelKey: "home",     icon: "home",  primary: "/",         routes: ["/"] },
  { key: "learn", labelKey: "learn",    icon: "book",  primary: "/learn",    routes: ["/learn"] },
  { key: "video", labelKey: "video",    icon: "play",  primary: "/video",    routes: ["/video"] },
  { key: "quiz",  labelKey: "quiz",     icon: "quiz",  primary: "/quiz",     routes: ["/quiz"] },
  { key: "ask",   labelKey: "ask",      icon: "chat",  primary: "/ask",      routes: ["/ask"] },
  { key: "apply", labelKey: "apply",    icon: "hand",  primary: "/apply",    routes: ["/apply"] },
  { key: "me",    labelKey: "progress", icon: "chart", primary: "/progress", routes: ["/progress"] },
];

export function activeTabKey(pathname: string): TabKey {
  if (pathname === "/") return "home";
  for (const tab of TABS) {
    if (tab.key === "home") continue;
    if (tab.routes.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
      return tab.key;
    }
  }
  return "home";
}

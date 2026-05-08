import type { SVGProps } from "react";

export const ICON_PATHS = {
  home: "M3 11l9-8 9 8M5 9v12h14V9",
  book: "M4 4h7a3 3 0 013 3v14M20 4h-7a3 3 0 00-3 3v14M4 4v17h7M20 4v17h-7",
  chat: "M4 5h16v11H9l-5 4V5z",
  quiz: "M9 11l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  play: "M8 5v14l11-7z",
  hand: "M7 11V5a2 2 0 114 0v4m0 0V3a2 2 0 114 0v6m0 0V5a2 2 0 114 0v9a7 7 0 01-14 0v-3a2 2 0 114 0v1",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  mic: "M12 3a3 3 0 00-3 3v6a3 3 0 106 0V6a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v3",
  cam: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z",
  check: "M5 12l5 5L20 7",
  arrowR: "M5 12h14M13 6l6 6-6 6",
  arrowL: "M19 12H5M11 6l-6 6 6 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  sparkle: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  flame: "M12 3c0 4 4 5 4 9a4 4 0 11-8 0c0-2 1-3 2-4 0-2-1-3 2-5z",
  pin: "M12 21s-7-7-7-12a7 7 0 1114 0c0 5-7 12-7 12zM12 11a2 2 0 100-4 2 2 0 000 4z",
  stop: "M6 6h12v12H6z",
  pause: "M8 5v14M16 5v14",
  plus: "M12 5v14M5 12h14",
  calendar: "M4 7h16v13H4zM4 7V4m0 3h16M20 7V4M8 3v4M16 3v4",
  clock: "M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  chevR: "M9 6l6 6-6 6",
  chevD: "M6 9l6 6 6-6",
  chevU: "M18 15l-6-6-6 6",
  chevL: "M15 18l-6-6 6-6",
  target: "M12 3v2M12 19v2M3 12h2M19 12h2M12 22a10 10 0 110-20 10 10 0 010 20zM12 17a5 5 0 110-10 5 5 0 010 10zM12 14a2 2 0 110-4 2 2 0 010 4z",
  rupee: "M6 4h12M6 8h12M9 4c4 0 5 4 0 4H6c4 0 6 3 9 8",
  ear: "M16 20a4 4 0 01-4-4M7 18a5 5 0 01-2-4 7 7 0 1114 0c0 3-3 3-3 6a3 3 0 11-6 0",
  wave: "M4 12h2M20 12h-2M8 7v10M12 4v16M16 7v10",
  stack: "M4 6l8-3 8 3-8 3zM4 12l8 3 8-3M4 18l8 3 8-3",
  leaf: "M5 20c0-9 7-14 14-14 0 9-5 14-14 14zM5 20L14 11",
  bell: "M5 17h14l-2-4v-4a5 5 0 00-10 0v4zM10 21h4",
  send: "M4 12l16-8-7 16-2-7z",
  pencil: "M4 20h4l11-11-4-4L4 16zM14 6l4 4",
  trash: "M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13",
  globe: "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  speaker: "M11 5L6 9H3v6h3l5 4zM15 9a4 4 0 010 6M18 6a8 8 0 010 12",
  speakerOff: "M11 5L6 9H3v6h3l5 4zM17 9l4 4M21 9l-4 4",
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name" | "stroke"> {
  name: IconName;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.75, ...rest }: IconProps) {
  const d = ICON_PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

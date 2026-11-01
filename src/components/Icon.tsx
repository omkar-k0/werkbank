// Thin 1.5px line icons, used sparingly (navigation only).
const PATHS = {
  board: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
  plus: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 8v8", "M8 12h8"],
  review: ["m3 17 2 2 4-4", "m3 7 2 2 4-4", "M13 6h8", "M13 12h8", "M13 18h8"],
  reports: ["M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"],
  workshops: ["M3 11 12 3l9 8", "M5 9.5V21h14V9.5", "M10 21v-6h4v6"],
  settings: ["M21 4h-7", "M10 4H3", "M21 12h-9", "M8 12H3", "M21 20h-5", "M12 20H3", "M14 2v4", "M8 10v4", "M16 18v4"],
  orders: ["M4 5h16", "M4 12h16", "M4 19h16"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

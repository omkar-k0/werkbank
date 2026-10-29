import { dateLocale, type Locale } from "@/lib/i18n";

// A model is never 100% sure; never display it as if it were.
export function pctLabel(p: number) {
  if (p >= 0.995) return "99%+";
  if (p > 0 && p < 0.005) return "<1%";
  return `${Math.round(p * 100)}%`;
}

export function fmtDate(d: string | null | undefined, locale: Locale) {
  if (!d) return "—";
  const dt = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  return dt.toLocaleDateString(dateLocale(locale), { day: "numeric", month: "short" });
}

export function isOverdue(o: { status: string; expected_date: string | null; due_date: string | null }) {
  const ref = o.expected_date ?? o.due_date;
  if (!ref || o.status === "done") return false;
  return ref < new Date().toISOString().slice(0, 10);
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`display inline-flex items-center gap-2 text-lg font-semibold ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
        <rect x="3" y="11" width="26" height="6" rx="1.5" fill="currentColor" />
        <rect x="6" y="17" width="3" height="11" rx="1" fill="currentColor" opacity=".75" />
        <rect x="23" y="17" width="3" height="11" rx="1" fill="currentColor" opacity=".75" />
        <path d="M10 11 L13 4 L16 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      Werkbank
    </span>
  );
}

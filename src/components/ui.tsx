import { CAPABILITIES, CAPABILITY_LABELS, type Capability } from "@/lib/classifier/types";

export const CAP_SHORT: Record<Capability, string> = {
  carpentry: "Carpentry",
  upholstery: "Upholstery",
  finishing: "Finishing",
  metal: "Metal",
};

export function GateBadge({ gate, source }: { gate: string; source?: string }) {
  if (source === "manual")
    return <span className="rounded-full bg-sawdust px-2 py-0.5 text-xs font-semibold text-muted">Set by hand</span>;
  const map: Record<string, [string, string]> = {
    auto: ["bg-moss-bg text-moss", "Auto-routed"],
    check: ["bg-amber-bg text-amber", "Check"],
    review: ["bg-rust-bg text-rust", "Needs review"],
  };
  const [cls, label] = map[gate] ?? map.review;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
      {source === "llm" ? " · LLM" : ""}
    </span>
  );
}

const STATUS: Record<string, [string, string]> = {
  not_started: ["bg-sawdust text-muted", "Not started"],
  in_progress: ["bg-amber-bg text-amber", "In progress"],
  done: ["bg-moss-bg text-moss", "Done"],
};
export function StatusPill({ status }: { status: string }) {
  const [cls, label] = STATUS[status] ?? STATUS.not_started;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function UrgencyTag({ urgency }: { urgency: string }) {
  if (urgency === "high") return <span className="text-xs font-bold uppercase tracking-wide text-rust">Urgent</span>;
  if (urgency === "low") return <span className="text-xs uppercase tracking-wide text-muted">No rush</span>;
  return null;
}

export function ProbabilityBars({ probabilities, chosen }: { probabilities: Record<string, number>; chosen?: string | null }) {
  return (
    <div className="space-y-1.5">
      {CAPABILITIES.map((c) => {
        const p = probabilities[c] ?? 0;
        return (
          <div key={c} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-sm">
            <span className={c === chosen ? "font-semibold" : "text-muted"} title={CAPABILITY_LABELS[c]}>
              {CAP_SHORT[c]}
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-sawdust">
              <div className={`h-full rounded-full ${c === chosen ? "bg-walnut" : "bg-muted/40"}`} style={{ width: `${Math.round(p * 100)}%` }} />
            </div>
            <span className="text-right tabular-nums text-muted">{pctLabel(p)}</span>
          </div>
        );
      })}
    </div>
  );
}

// A model is never 100% sure; never display it as if it were.
export function pctLabel(p: number) {
  if (p >= 0.995) return "99%+";
  if (p > 0 && p < 0.005) return "<1%";
  return `${Math.round(p * 100)}%`;
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

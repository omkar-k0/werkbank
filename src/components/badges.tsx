"use client";
import { CAPABILITIES, type Capability } from "@/lib/classifier/types";
import { useT } from "./I18n";
import { pctLabel } from "./ui";

// These read the visitor's language from context, so they work in server and client pages alike.

export function GateBadge({ gate, source }: { gate: string; source?: string }) {
  const t = useT();
  if (source === "manual")
    return <span className="rounded-full bg-sawdust px-2 py-0.5 text-xs font-semibold text-muted">{t("gate.manual")}</span>;
  const map = {
    auto: ["bg-moss-bg text-moss", t("gate.auto")],
    check: ["bg-amber-bg text-amber", t("gate.check")],
    review: ["bg-rust-bg text-rust", t("gate.review")],
  } as Record<string, [string, string]>;
  const [cls, label] = map[gate] ?? map.review;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
      {source === "llm" ? " · LLM" : ""}
    </span>
  );
}

const STATUS_CLS: Record<string, string> = {
  not_started: "bg-sawdust text-muted",
  in_progress: "bg-amber-bg text-amber",
  done: "bg-moss-bg text-moss",
};
export function StatusPill({ status }: { status: string }) {
  const t = useT();
  const s = (status in STATUS_CLS ? status : "not_started") as "not_started" | "in_progress" | "done";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[s]}`}>{t(`status.${s}`)}</span>;
}

export function UrgencyTag({ urgency }: { urgency: string }) {
  const t = useT();
  if (urgency === "high") return <span className="text-xs font-bold uppercase tracking-wide text-rust">{t("urgency.high")}</span>;
  if (urgency === "low") return <span className="text-xs uppercase tracking-wide text-muted">{t("urgency.low")}</span>;
  return null;
}

// Display names for stored enum values (job type, urgency); unknown values pass through.
export function useLabels() {
  const t = useT();
  return {
    job: (v: string) => (["repair", "custom", "refurbish", "assembly"].includes(v) ? t(`job.${v as "repair"}`) : v),
    urgency: (v: string) => (["high", "normal", "low"].includes(v) ? t(`urgencyVal.${v as "high"}`) : v),
    cap: (c: Capability) => t(`capShort.${c}`),
  };
}

export function ProbabilityBars({ probabilities, chosen }: { probabilities: Record<string, number>; chosen?: string | null }) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      {CAPABILITIES.map((c) => {
        const p = probabilities[c] ?? 0;
        return (
          <div key={c} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-sm">
            <span className={c === chosen ? "font-semibold" : "text-muted"} title={t(`cap.${c}`)}>
              {t(`capShort.${c}`)}
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

"use client";
import { CAPABILITIES, type Capability } from "@/lib/classifier/types";
import { useT } from "./I18n";
import { pctLabel } from "./ui";

// These read the visitor's language from context, so they work in server and client pages alike.

function Dotted({ color, label, strong = false, muted = false }: { color: string; label: string; strong?: boolean; muted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${strong ? "font-medium" : ""} ${muted ? "text-muted" : ""}`}>
      <span className={`dot ${color}`} />
      {label}
    </span>
  );
}

export function GateBadge({ gate, source }: { gate: string; source?: string }) {
  const t = useT();
  if (source === "manual") return <Dotted color="bg-muted/50" label={t("gate.manual")} muted />;
  const label = gate === "auto" ? t("gate.auto") : gate === "check" ? t("gate.check") : t("gate.review");
  const color = gate === "auto" ? "bg-moss" : gate === "check" ? "bg-amber" : "bg-rust";
  return <Dotted color={color} label={label + (source === "llm" ? " · LLM" : "")} strong={gate === "review"} />;
}

const STATUS_DOT: Record<string, string> = { not_started: "bg-muted/40", in_progress: "bg-amber", done: "bg-moss" };
export function StatusPill({ status }: { status: string }) {
  const t = useT();
  const s = (status in STATUS_DOT ? status : "not_started") as "not_started" | "in_progress" | "done";
  return <Dotted color={STATUS_DOT[s]} label={t(`status.${s}`)} muted={s !== "in_progress"} />;
}

export function UrgencyTag({ urgency }: { urgency: string }) {
  const t = useT();
  if (urgency === "high") return <span className="rounded bg-rust-bg px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rust">{t("urgency.high")}</span>;
  if (urgency === "low") return <span className="text-[11px] uppercase tracking-wide text-muted">{t("urgency.low")}</span>;
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

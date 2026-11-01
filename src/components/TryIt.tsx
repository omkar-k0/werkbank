"use client";
import { useEffect, useState } from "react";
import type { Classification } from "@/lib/classifier/types";
import { localizeReason } from "@/lib/i18n/dynamic";
import { GateBadge, ProbabilityBars, useLabels } from "./badges";
import { useLocale, useT } from "./I18n";
import { pctLabel } from "./ui";

const EXAMPLES = ["try.ex1", "try.ex2", "try.ex3", "try.ex4", "try.ex5"] as const;

export function TryIt() {
  const t = useT();
  const locale = useLocale();
  const L = useLabels();
  // The text box shows an example in the current language until the visitor types their own.
  const [idx, setIdx] = useState(0);
  const [custom, setCustom] = useState<string | null>(null);
  const text = custom ?? t(EXAMPLES[idx]);
  const [res, setRes] = useState<Classification | null>(null);
  useEffect(() => {
    const id = setTimeout(async () => {
      const r = await fetch("/api/try", { method: "POST", body: JSON.stringify({ text }) });
      const j = await r.json();
      setRes(j.routing ? j : null);
    }, 250);
    return () => clearTimeout(id);
  }, [text]);
  const top = res ? (Object.entries(res.routing.probabilities).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof res.routing.probabilities) : null;
  return (
    <div className="card p-6 text-left">
      <label className="eyebrow">{t("try.label")}</label>
      <textarea className="input mt-3 h-24 resize-none text-base" value={text} onChange={(e) => setCustom(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((k, i) => {
          const e = t(k);
          return (
            <button key={k} onClick={() => { setCustom(null); setIdx(i); }} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:bg-sawdust">
              {e.length > 34 ? e.slice(0, 32) + "…" : e}
            </button>
          );
        })}
      </div>
      {res && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="display text-2xl">
              {res.routing.gate === "review" ? t("try.held") : `→ ${L.cap(res.routing.capability!)}`}
            </span>
            <GateBadge gate={res.routing.gate} />
            <span className="text-sm text-muted">{t("try.sure", { pct: pctLabel(res.routing.confidence) })}</span>
          </div>
          <p className="text-sm text-muted">{localizeReason(locale, res.routing.reason)}</p>
          <ProbabilityBars probabilities={res.routing.probabilities} chosen={res.routing.capability ?? top} />
          <div className="flex flex-wrap gap-1.5 text-xs">
            {res.routing.evidence.slice(0, 6).map((e) => (
              <span key={e.token} className="rounded bg-sawdust px-1.5 py-0.5">“{e.token}” → {L.cap(e.capability)}</span>
            ))}
            <span className="rounded bg-sawdust px-1.5 py-0.5">{t("try.job", { v: L.job(res.labels.jobType) })}</span>
            <span className="rounded bg-sawdust px-1.5 py-0.5">{t("try.urgency", { v: L.urgency(res.labels.urgency) })}</span>
            <span className="rounded bg-sawdust px-1.5 py-0.5">{t("try.effort", { v: res.labels.effort })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

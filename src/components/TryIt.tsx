"use client";
import { useEffect, useState } from "react";
import type { Classification } from "@/lib/classifier/types";
import { CAP_SHORT, GateBadge, pctLabel, ProbabilityBars } from "./ui";

const EXAMPLES = [
  "Sofa cushions are completely flat, customer wants firmer foam",
  "Dining table has white water rings from hot cups",
  "Balcony chair, the iron frame is rusty and one weld broke",
  "Wardrobe door hanging off, hinge loose, urgent before guests come",
  "Chair broken",
];

export function TryIt() {
  const [text, setText] = useState(EXAMPLES[0]);
  const [res, setRes] = useState<Classification | null>(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch("/api/try", { method: "POST", body: JSON.stringify({ text }) });
      const j = await r.json();
      setRes(j.routing ? j : null);
    }, 250);
    return () => clearTimeout(t);
  }, [text]);
  const top = res ? (Object.entries(res.routing.probabilities).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof CAP_SHORT) : null;
  return (
    <div className="card p-5 shadow-sm">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted">Type a customer request</label>
      <textarea className="input mt-2 h-24 resize-none" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => setText(e)} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:bg-sawdust">
            {e.length > 34 ? e.slice(0, 32) + "…" : e}
          </button>
        ))}
      </div>
      {res && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="display text-xl font-semibold">
              {res.routing.gate === "review" ? "Held for a person" : `→ ${CAP_SHORT[res.routing.capability!]}`}
            </span>
            <GateBadge gate={res.routing.gate} />
            <span className="text-sm text-muted">{pctLabel(res.routing.confidence)} sure</span>
          </div>
          <p className="text-sm text-muted">{res.routing.reason}</p>
          <ProbabilityBars probabilities={res.routing.probabilities} chosen={res.routing.capability ?? top} />
          <div className="flex flex-wrap gap-1.5 text-xs">
            {res.routing.evidence.slice(0, 6).map((e) => (
              <span key={e.token} className="rounded bg-sawdust px-1.5 py-0.5">“{e.token}” → {CAP_SHORT[e.capability]}</span>
            ))}
            <span className="rounded bg-sawdust px-1.5 py-0.5">job: {res.labels.jobType}</span>
            <span className="rounded bg-sawdust px-1.5 py-0.5">urgency: {res.labels.urgency}</span>
            <span className="rounded bg-sawdust px-1.5 py-0.5">effort: {res.labels.effort}</span>
          </div>
        </div>
      )}
    </div>
  );
}

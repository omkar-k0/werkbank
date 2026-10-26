"use client";
import { useEffect, useState } from "react";
import type { Classification } from "@/lib/classifier/types";
import { CAP_SHORT, GateBadge, ProbabilityBars } from "./ui";

type Preview = Classification & { workshop: { id: string; name: string } | null };

export function NewOrderForm({ llm }: { llm: boolean }) {
  const [item, setItem] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [p, setP] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch("/api/classify", { method: "POST", body: JSON.stringify({ item, description, dueDate: dueDate || null }) });
      const j = await r.json().catch(() => null);
      setP(j?.routing ? j : null);
    }, 300);
    return () => clearTimeout(t);
  }, [item, description, dueDate]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
          const r = await fetch("/api/orders", { method: "POST", body: JSON.stringify(fd) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) {
            setError(j.error ?? "Could not save");
            setBusy(false);
            return;
          }
          window.location.href = `/app/orders/${j.order.id}`;
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">Customer name</span><input name="customerName" className="input mt-1" required /></label>
          <label className="block"><span className="text-sm font-medium">Phone</span><input name="customerPhone" className="input mt-1" type="tel" /></label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Item</span>
          <input name="item" className="input mt-1" placeholder="e.g. 3-seater sofa" value={item} onChange={(e) => setItem(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium">What does the customer want?</span>
          <textarea
            name="description"
            className="input mt-1 h-32"
            placeholder="Write it like a job slip: cushions sagging, wants new foam and a darker fabric, before 12 Dec"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className="block sm:w-1/2">
          <span className="text-sm font-medium">Customer due date</span>
          <input name="dueDate" type="date" className="input mt-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        {error && <p className="rounded-lg bg-rust-bg px-3 py-2 text-sm text-rust">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Saving…" : p?.routing.gate === "review" ? "Save to review queue" : "Save and send to workshop"}</button>
      </form>

      <aside className="card h-fit p-6 lg:sticky lg:top-6">
        <h2 className="text-lg font-semibold">Where it will go</h2>
        {!p ? (
          <p className="mt-2 text-sm text-muted">Start typing. The routing appears here as you write.</p>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="display text-2xl font-semibold">{p.workshop ? p.workshop.name : "Review queue"}</span>
              <GateBadge gate={p.routing.gate} />
            </div>
            <p className="text-sm text-muted">
              {p.routing.reason}
              {p.routing.gate === "review" && llm ? " On save, the LLM gets a look and must quote the request to route it." : ""}
            </p>
            <ProbabilityBars probabilities={p.routing.probabilities} chosen={p.routing.capability} />
            {p.routing.secondary && <p className="text-sm">Also involves <b>{CAP_SHORT[p.routing.secondary]}</b>.</p>}
            {!!p.routing.evidence.length && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Words that decided it</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  {p.routing.evidence.slice(0, 8).map((e) => (
                    <span key={e.token} className="rounded bg-sawdust px-1.5 py-0.5">“{e.token}” → {CAP_SHORT[e.capability]}</span>
                  ))}
                </div>
              </div>
            )}
            <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
              <div><dt className="text-muted">Job type</dt><dd className="font-medium capitalize">{p.labels.jobType}</dd></div>
              <div><dt className="text-muted">Urgency</dt><dd className={`font-medium capitalize ${p.labels.urgency === "high" ? "text-rust" : ""}`}>{p.labels.urgency}</dd></div>
              <div><dt className="text-muted">Effort</dt><dd className="font-medium">{p.labels.effort}</dd></div>
            </dl>
            {!!p.labels.urgencyCues.length && <p className="text-xs text-muted">Urgent because: {p.labels.urgencyCues.join(", ")}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}

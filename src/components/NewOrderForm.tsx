"use client";
import { useEffect, useState } from "react";
import type { Classification } from "@/lib/classifier/types";
import { splitAt } from "@/lib/i18n";
import { localizeReason } from "@/lib/i18n/dynamic";
import { GateBadge, ProbabilityBars, useLabels } from "./badges";
import { useLocale, useT } from "./I18n";

type Preview = Classification & { workshop: { id: string; name: string } | null };

export function NewOrderForm({ llm }: { llm: boolean }) {
  const t = useT();
  const locale = useLocale();
  const L = useLabels();
  const [item, setItem] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [p, setP] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const also = splitAt(t, "order.alsoInvolves", "cap");
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
            setError(j.error ?? t("common.couldNotSave"));
            setBusy(false);
            return;
          }
          window.location.href = `/app/orders/${j.order.id}`;
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">{t("new.customerName")}</span><input name="customerName" className="input mt-1" required /></label>
          <label className="block"><span className="text-sm font-medium">{t("new.phone")}</span><input name="customerPhone" className="input mt-1" type="tel" /></label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">{t("new.item")}</span>
          <input name="item" className="input mt-1" placeholder={t("new.itemPh")} value={item} onChange={(e) => setItem(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("new.want")}</span>
          <textarea
            name="description"
            className="input mt-1 h-32"
            placeholder={t("new.wantPh")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label className="block sm:w-1/2">
          <span className="text-sm font-medium">{t("new.dueDate")}</span>
          <input name="dueDate" type="date" className="input mt-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        {error && <p className="rounded-lg bg-rust-bg px-3 py-2 text-sm text-rust">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? t("new.saving") : p?.routing.gate === "review" ? t("new.saveReview") : t("new.saveSend")}</button>
      </form>

      <aside className="card h-fit p-6 lg:sticky lg:top-6">
        <h2 className="text-lg font-semibold">{t("new.whereH")}</h2>
        {!p ? (
          <p className="mt-2 text-sm text-muted">{t("new.start")}</p>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="display text-2xl font-semibold">{p.workshop ? p.workshop.name : t("new.reviewQueue")}</span>
              <GateBadge gate={p.routing.gate} />
            </div>
            <p className="text-sm text-muted">
              {localizeReason(locale, p.routing.reason)}
              {p.routing.gate === "review" && llm ? t("new.llmNote") : ""}
            </p>
            <ProbabilityBars probabilities={p.routing.probabilities} chosen={p.routing.capability} />
            {p.routing.secondary && <p className="text-sm">{also[0]}<b>{L.cap(p.routing.secondary)}</b>{also[1]}</p>}
            {!!p.routing.evidence.length && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">{t("new.words")}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  {p.routing.evidence.slice(0, 8).map((e) => (
                    <span key={e.token} className="rounded bg-sawdust px-1.5 py-0.5">“{e.token}” → {L.cap(e.capability)}</span>
                  ))}
                </div>
              </div>
            )}
            <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
              <div><dt className="text-muted">{t("order.jobType")}</dt><dd className="font-medium capitalize">{L.job(p.labels.jobType)}</dd></div>
              <div><dt className="text-muted">{t("order.urgency")}</dt><dd className={`font-medium capitalize ${p.labels.urgency === "high" ? "text-rust" : ""}`}>{L.urgency(p.labels.urgency)}</dd></div>
              <div><dt className="text-muted">{t("order.effort")}</dt><dd className="font-medium">{p.labels.effort}</dd></div>
            </dl>
            {!!p.labels.urgencyCues.length && <p className="text-xs text-muted">{t("new.urgentBecause", { cues: p.labels.urgencyCues.join(", ") })}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}

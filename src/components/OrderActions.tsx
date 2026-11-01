"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLabels } from "./badges";
import { useT } from "./I18n";

const NEXT = {
  not_started: [["in_progress", "act.start"]],
  in_progress: [["done", "act.markDone"], ["not_started", "act.backToNotStarted"]],
  done: [["in_progress", "act.reopen"]],
} as const;

async function call(url: string, method: string, body: unknown, fallback: string) {
  const r = await fetch(url, { method, body: JSON.stringify(body) });
  if (!r.ok) alertSoft((await r.json().catch(() => ({}))).error ?? fallback);
  return r.ok;
}
function alertSoft(msg: string) {
  // no blocking dialogs; a tiny toast instead
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = "fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-rust px-4 py-2 text-sm text-white shadow-lg z-50";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function StatusButtons({ id, status, compact = false, workshopId, quiet = false }: { id: string; status: string; compact?: boolean; workshopId?: string; quiet?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {NEXT[status as keyof typeof NEXT].map(([to, label], i) => (
        <button
          key={to}
          disabled={busy}
          className={i === 0 && !quiet ? `btn ${compact ? "min-h-12 w-full text-base" : ""}` : `btn btn-ghost ${compact ? "min-h-12 w-full" : ""}`}
          onClick={async () => {
            setBusy(true);
            await call(`/api/orders/${id}`, "PATCH", { status: to, workshopId }, t("common.couldNotSave"));
            setBusy(false);
            router.refresh();
          }}
        >
          {t(label)}
        </button>
      ))}
    </div>
  );
}

export function ExpectedDate({ id, value, workshopId }: { id: string; value: string | null; workshopId?: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      {t("act.expectedFinish")}
      <input
        type="date"
        className="input w-auto py-1"
        defaultValue={value ?? ""}
        onChange={async (e) => {
          await call(`/api/orders/${id}`, "PATCH", { expectedDate: e.target.value || null, workshopId }, t("common.couldNotSave"));
          router.refresh();
        }}
      />
    </label>
  );
}

export function AssignSelect({
  id,
  current,
  workshops,
  suggested,
}: {
  id: string;
  current: string | null;
  workshops: { id: string; name: string }[];
  suggested?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {workshops.map((w) => (
        <button
          key={w.id}
          disabled={busy || w.id === current}
          className={`btn ${w.id === suggested && !current ? "" : "btn-ghost"} ${w.id === current ? "ring-2 ring-walnut" : ""}`}
          onClick={async () => {
            setBusy(true);
            await call(`/api/orders/${id}/assign`, "POST", { workshopId: w.id }, t("common.couldNotSave"));
            setBusy(false);
            router.refresh();
          }}
        >
          {w.name}
          {w.id === suggested && !current ? t("act.suggested") : ""}
        </button>
      ))}
    </div>
  );
}

export function JobTypeSelect({ id, value, workshopId }: { id: string; value: string; workshopId: string | null }) {
  const t = useT();
  const L = useLabels();
  const router = useRouter();
  if (!workshopId) return <span className="font-medium capitalize">{L.job(value)}</span>;
  return (
    <select
      className="input w-auto py-1 capitalize"
      defaultValue={value}
      onChange={async (e) => {
        await call(`/api/orders/${id}/assign`, "POST", { workshopId, jobType: e.target.value }, t("common.couldNotSave"));
        router.refresh();
      }}
    >
      {["repair", "custom", "refurbish", "assembly"].map((j) => (
        <option key={j} value={j}>{L.job(j)}</option>
      ))}
    </select>
  );
}

// Owner: send a second part of the order to another workshop.
export function SplitPicker({ id, workshops, suggested }: { id: string; workshops: { id: string; name: string }[]; suggested?: string | null }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      <input className="input" value={note} maxLength={300} placeholder={t("order.splitNotePh")} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {workshops.map((w) => (
          <button
            key={w.id}
            disabled={busy}
            className={`btn ${w.id === suggested ? "" : "btn-ghost"}`}
            onClick={async () => {
              setBusy(true);
              await call(`/api/orders/${id}/split`, "POST", { workshopId: w.id, note }, t("common.couldNotSave"));
              setBusy(false);
              router.refresh();
            }}
          >
            {t("order.splitSend", { ws: w.name })}
            {w.id === suggested ? t("act.suggested") : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

export function UnsplitButton({ id, name }: { id: string; name: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await call(`/api/orders/${id}/split`, "DELETE", undefined, t("common.couldNotSave"));
        setBusy(false);
        router.refresh();
      }}
    >
      {t("order.splitRemove", { ws: name })}
    </button>
  );
}

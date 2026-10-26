"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NEXT: Record<string, [string, string][]> = {
  not_started: [["in_progress", "Start"]],
  in_progress: [["done", "Mark done"], ["not_started", "Back to not started"]],
  done: [["in_progress", "Reopen"]],
};

async function call(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, body: JSON.stringify(body) });
  if (!r.ok) alertSoft((await r.json().catch(() => ({}))).error ?? "Could not save");
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

export function StatusButtons({ id, status, compact = false }: { id: string; status: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {NEXT[status].map(([to, label], i) => (
        <button
          key={to}
          disabled={busy}
          className={i === 0 ? "btn" : `btn btn-ghost ${compact ? "hidden sm:inline-flex" : ""}`}
          onClick={async () => {
            setBusy(true);
            await call(`/api/orders/${id}`, "PATCH", { status: to });
            setBusy(false);
            router.refresh();
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function ExpectedDate({ id, value }: { id: string; value: string | null }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Expected finish
      <input
        type="date"
        className="input w-auto py-1"
        defaultValue={value ?? ""}
        onChange={async (e) => {
          await call(`/api/orders/${id}`, "PATCH", { expectedDate: e.target.value || null });
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
            await call(`/api/orders/${id}/assign`, "POST", { workshopId: w.id });
            setBusy(false);
            router.refresh();
          }}
        >
          {w.name}
          {w.id === suggested && !current ? " (suggested)" : ""}
        </button>
      ))}
    </div>
  );
}

export function JobTypeSelect({ id, value, workshopId }: { id: string; value: string; workshopId: string | null }) {
  const router = useRouter();
  if (!workshopId) return <span className="font-medium capitalize">{value}</span>;
  return (
    <select
      className="input w-auto py-1 capitalize"
      defaultValue={value}
      onChange={async (e) => {
        await call(`/api/orders/${id}/assign`, "POST", { workshopId, jobType: e.target.value });
        router.refresh();
      }}
    >
      {["repair", "custom", "refurbish", "assembly"].map((j) => (
        <option key={j} value={j}>{j}</option>
      ))}
    </select>
  );
}

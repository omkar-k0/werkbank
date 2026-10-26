"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS = [
  ["strict", "Strict", "Only the clearest orders skip review. More orders wait for you."],
  ["balanced", "Balanced", "Default. Clear orders go straight through, close calls are flagged."],
  ["relaxed", "Relaxed", "More orders are routed automatically. More mistakes slip through."],
] as const;

export function StrictnessForm({ value }: { value: string }) {
  const router = useRouter();
  const [v, setV] = useState(value);
  return (
    <div className="space-y-2">
      {OPTIONS.map(([id, label, help]) => (
        <label key={id} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${v === id ? "border-walnut bg-sawdust" : "border-line"}`}>
          <input
            type="radio"
            name="strictness"
            checked={v === id}
            onChange={async () => {
              setV(id);
              await fetch("/api/shop", { method: "PATCH", body: JSON.stringify({ strictness: id }) });
              router.refresh();
            }}
          />
          <span><span className="font-semibold">{label}</span><span className="block text-sm text-muted">{help}</span></span>
        </label>
      ))}
    </div>
  );
}

export function PlanSelect({ value }: { value: string }) {
  const router = useRouter();
  return (
    <select
      className="input w-auto"
      defaultValue={value}
      onChange={async (e) => {
        await fetch("/api/shop", { method: "PATCH", body: JSON.stringify({ plan: e.target.value }) });
        router.refresh();
      }}
    >
      <option value="trial">Free trial</option>
      <option value="starter">Starter · €29/month</option>
      <option value="pro">Pro · €59/month</option>
      <option value="lifetime">Lifetime licence · €790 once</option>
    </select>
  );
}

export function ResetDemo() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/demo/reset", { method: "POST" });
        await fetch("/api/demo", { method: "POST" });
        window.location.href = "/app";
      }}
    >
      {busy ? "Resetting…" : "Reset demo data"}
    </button>
  );
}

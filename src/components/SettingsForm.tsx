"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "./I18n";

const OPTIONS = ["strict", "balanced", "relaxed"] as const;

export function StrictnessForm({ value }: { value: string }) {
  const t = useT();
  const router = useRouter();
  const [v, setV] = useState(value);
  return (
    <div className="space-y-2">
      {OPTIONS.map((id) => (
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
          <span><span className="font-semibold">{t(`settings.strict.${id}`)}</span><span className="block text-sm text-muted">{t(`settings.strict.${id}Help`)}</span></span>
        </label>
      ))}
    </div>
  );
}

export function PlanSelect({ value }: { value: string }) {
  const t = useT();
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
      <option value="trial">{t("plan.trial")}</option>
      <option value="starter">{t("plan.starterOption")}</option>
      <option value="pro">{t("plan.proOption")}</option>
      <option value="lifetime">{t("plan.lifetimeOption")}</option>
    </select>
  );
}

export function ResetDemo() {
  const t = useT();
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
      {busy ? t("settings.resetting") : t("settings.resetDemo")}
    </button>
  );
}

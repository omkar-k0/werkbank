"use client";
import { useState } from "react";
import { useT } from "./I18n";

type Field = { name: string; label: string; type?: string; placeholder?: string; autoComplete?: string };

export function AuthForm({
  endpoint,
  fields,
  submit,
  extra = {},
}: {
  endpoint: string;
  fields: Field[];
  submit: string;
  extra?: Record<string, string>;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        const r = await fetch(endpoint, { method: "POST", body: JSON.stringify({ ...data, ...extra }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(j.error ?? t("common.somethingWrong"));
          setBusy(false);
          return;
        }
        window.location.href = "/app";
      }}
    >
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="text-sm font-medium">{f.label}</span>
          <input className="input mt-1" name={f.name} type={f.type ?? "text"} placeholder={f.placeholder} autoComplete={f.autoComplete} required />
        </label>
      ))}
      {error && <p className="rounded-lg bg-rust-bg px-3 py-2 text-sm text-rust">{error}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? t("common.oneMoment") : submit}</button>
    </form>
  );
}

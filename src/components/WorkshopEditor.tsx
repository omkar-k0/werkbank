"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAPABILITIES, type Capability } from "@/lib/classifier/types";
import { useT } from "./I18n";

async function send(url: string, method: string, body: unknown, fallback: string): Promise<string | null> {
  const r = await fetch(url, { method, body: JSON.stringify(body) });
  if (r.ok) return null;
  return (await r.json().catch(() => ({}))).error ?? fallback;
}

function CapPicker({ value, onChange }: { value: Capability[]; onChange: (v: Capability[]) => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      {CAPABILITIES.map((c) => (
        <label key={c} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${value.includes(c) ? "border-walnut bg-walnut text-walnut-ink" : "border-line"}`}>
          <input type="checkbox" className="sr-only" checked={value.includes(c)} onChange={(e) => onChange(e.target.checked ? [...value, c] : value.filter((x) => x !== c))} />
          {t(`cap.${c}`)}
        </label>
      ))}
    </div>
  );
}

export function WorkshopCard({ w, users }: { w: { id: string; name: string; capabilities: Capability[] }; users: { email: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState(w.name);
  const [caps, setCaps] = useState<Capability[]>(w.capabilities);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = name !== w.name || caps.join() !== w.capabilities.join();
  return (
    <div className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-xs font-semibold" value={name} onChange={(e) => setName(e.target.value)} />
        {dirty && (
          <button className="btn" onClick={async () => { setMsg(await send(`/api/workshops/${w.id}`, "PATCH", { name, capabilities: caps }, t("common.couldNotSave"))); router.refresh(); }}>{t("workshops.save")}</button>
        )}
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("workshops.handles")}</div>
        <CapPicker value={caps} onChange={setCaps} />
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("workshops.logins")}</div>
        {users.length ? (
          <ul className="text-sm">{users.map((u) => <li key={u.email}>{u.name} · <span className="text-muted">{u.email}</span></li>)}</ul>
        ) : <p className="text-sm text-muted">{t("workshops.noLogin")}</p>}
        <form
          className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = Object.fromEntries(new FormData(form).entries());
            const err = await send(`/api/workshops/${w.id}/users`, "POST", fd, t("common.couldNotSave"));
            setMsg(err ?? t("workshops.loginCreated"));
            if (!err) { form.reset(); router.refresh(); }
          }}
        >
          <input name="name" placeholder={t("workshops.name")} className="input py-1.5 text-sm" required />
          <input name="email" type="email" placeholder={t("workshops.email")} className="input py-1.5 text-sm" required />
          <input name="password" type="password" placeholder={t("workshops.password")} minLength={8} className="input py-1.5 text-sm" required />
          <button className="btn btn-ghost py-1.5">{t("workshops.addLogin")}</button>
        </form>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

export function NewWorkshop() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [caps, setCaps] = useState<Capability[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="card space-y-3 border-dashed p-5">
      <h2 className="font-semibold">{t("workshops.addH")}</h2>
      <input className="input max-w-xs" placeholder={t("workshops.addPh")} value={name} onChange={(e) => setName(e.target.value)} />
      <CapPicker value={caps} onChange={setCaps} />
      <button
        className="btn"
        disabled={!name || !caps.length}
        onClick={async () => {
          const err = await send("/api/workshops", "POST", { name, capabilities: caps }, t("common.couldNotSave"));
          setMsg(err);
          if (!err) { setName(""); setCaps([]); router.refresh(); }
        }}
      >
        {t("workshops.add")}
      </button>
      {msg && <p className="text-sm text-rust">{msg}</p>}
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAPABILITIES, CAPABILITY_LABELS, type Capability } from "@/lib/classifier/types";

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const r = await fetch(url, { method, body: JSON.stringify(body) });
  if (r.ok) return null;
  return (await r.json().catch(() => ({}))).error ?? "Could not save";
}

function CapPicker({ value, onChange }: { value: Capability[]; onChange: (v: Capability[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CAPABILITIES.map((c) => (
        <label key={c} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${value.includes(c) ? "border-walnut bg-walnut text-walnut-ink" : "border-line"}`}>
          <input type="checkbox" className="sr-only" checked={value.includes(c)} onChange={(e) => onChange(e.target.checked ? [...value, c] : value.filter((x) => x !== c))} />
          {CAPABILITY_LABELS[c]}
        </label>
      ))}
    </div>
  );
}

export function WorkshopCard({ w, users }: { w: { id: string; name: string; capabilities: Capability[] }; users: { email: string; name: string }[] }) {
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
          <button className="btn" onClick={async () => { setMsg(await send(`/api/workshops/${w.id}`, "PATCH", { name, capabilities: caps })); router.refresh(); }}>Save</button>
        )}
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Handles</div>
        <CapPicker value={caps} onChange={setCaps} />
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Logins</div>
        {users.length ? (
          <ul className="text-sm">{users.map((u) => <li key={u.email}>{u.name} · <span className="text-muted">{u.email}</span></li>)}</ul>
        ) : <p className="text-sm text-muted">No login yet.</p>}
        <form
          className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = Object.fromEntries(new FormData(form).entries());
            const err = await send(`/api/workshops/${w.id}/users`, "POST", fd);
            setMsg(err ?? "Login created.");
            if (!err) { form.reset(); router.refresh(); }
          }}
        >
          <input name="name" placeholder="Name" className="input py-1.5 text-sm" required />
          <input name="email" type="email" placeholder="Email" className="input py-1.5 text-sm" required />
          <input name="password" type="password" placeholder="Password" minLength={8} className="input py-1.5 text-sm" required />
          <button className="btn btn-ghost py-1.5">Add login</button>
        </form>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

export function NewWorkshop() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [caps, setCaps] = useState<Capability[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="card space-y-3 border-dashed p-5">
      <h2 className="font-semibold">Add a workshop</h2>
      <input className="input max-w-xs" placeholder="Name, e.g. Glass & mirrors" value={name} onChange={(e) => setName(e.target.value)} />
      <CapPicker value={caps} onChange={setCaps} />
      <button
        className="btn"
        disabled={!name || !caps.length}
        onClick={async () => {
          const err = await send("/api/workshops", "POST", { name, capabilities: caps });
          setMsg(err);
          if (!err) { setName(""); setCaps([]); router.refresh(); }
        }}
      >
        Add workshop
      </button>
      {msg && <p className="text-sm text-rust">{msg}</p>}
    </div>
  );
}

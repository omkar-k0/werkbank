import Link from "next/link";
import { ExpectedDate, StatusButtons } from "@/components/OrderActions";
import { fmtDate, GateBadge, isOverdue, StatusPill, UrgencyTag } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { listOrders, listWorkshops, type OrderFilter, type OrderRow } from "@/lib/repo";

export const metadata = { title: "Board" };

export default async function Board({ searchParams }: { searchParams: Promise<{ ws?: string; status?: string; q?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  return s.role === "owner" ? <OwnerBoard sp={sp} /> : <WorkshopBoard />;
}

async function OwnerBoard({ sp }: { sp: { ws?: string; status?: string; q?: string } }) {
  const s = await requireSession();
  const status = (["open", "done", "all"].includes(sp.status ?? "") ? sp.status : "open") as OrderFilter["status"];
  const [orders, all, workshops] = await Promise.all([
    listOrders(s, { status, workshopId: sp.ws, q: sp.q }),
    listOrders(s, { status: "all" }),
    listWorkshops(s),
  ]);
  const open = all.filter((o) => o.status !== "done");
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const kpis = [
    ["Open orders", open.length, ""],
    ["Overdue", open.filter(isOverdue).length, "text-rust"],
    ["Waiting for review", open.filter((o) => !o.workshop_id).length, "text-amber"],
    ["Done this week", all.filter((o) => o.status === "done" && (o.completed_at ?? "") >= weekAgo).length, "text-moss"],
  ] as const;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ws: sp.ws, status: sp.status, q: sp.q, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/app${p.size ? `?${p}` : ""}`;
  };
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold">Board</h1>
        <Link href="/app/new" className="btn">+ New order</Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([label, n, cls]) => (
          <div key={label} className="card p-4">
            <div className={`display text-3xl font-semibold ${cls}`}>{n}</div>
            <div className="text-sm text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={qs({ ws: undefined })} className={`rounded-full border px-3 py-1 text-sm ${!sp.ws ? "border-walnut bg-walnut text-walnut-ink" : "border-line hover:bg-sawdust"}`}>All workshops</Link>
        {workshops.map((w) => (
          <Link key={w.id} href={qs({ ws: w.id })} className={`rounded-full border px-3 py-1 text-sm ${sp.ws === w.id ? "border-walnut bg-walnut text-walnut-ink" : "border-line hover:bg-sawdust"}`}>
            {w.name} <span className="opacity-70">{open.filter((o) => o.workshop_id === w.id).length}</span>
          </Link>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        {(["open", "done", "all"] as const).map((st) => (
          <Link key={st} href={qs({ status: st === "open" ? undefined : st })} className={`rounded-full px-3 py-1 text-sm capitalize ${status === st ? "bg-sawdust font-semibold" : "text-muted hover:bg-sawdust"}`}>{st}</Link>
        ))}
        <form className="ml-auto" action="/app">
          {sp.ws && <input type="hidden" name="ws" value={sp.ws} />}
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input name="q" defaultValue={sp.q} placeholder="Search customer, item, #" className="input w-56 py-1.5 text-sm" />
        </form>
      </div>

      <div className="card mt-4 divide-y divide-line overflow-hidden">
        <div className="hidden grid-cols-[4rem_1.6fr_1.2fr_8rem_7rem_6rem] gap-3 bg-sawdust px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
          <span>#</span><span>Order</span><span>Workshop</span><span>Routing</span><span>Status</span><span>Due</span>
        </div>
        {orders.length === 0 && <p className="p-6 text-muted">No orders here.</p>}
        {orders.map((o) => <Row key={o.id} o={o} />)}
      </div>
    </div>
  );
}

function Row({ o }: { o: OrderRow }) {
  const overdue = isOverdue(o);
  return (
    <Link href={`/app/orders/${o.id}`} className={`grid gap-1 px-4 py-3 hover:bg-sawdust/60 md:grid-cols-[4rem_1.6fr_1.2fr_8rem_7rem_6rem] md:items-center md:gap-3 ${overdue ? "border-l-4 border-l-rust" : ""}`}>
      <span className="text-sm tabular-nums text-muted">#{o.number}</span>
      <span className="min-w-0">
        <span className="font-medium">{o.item}</span> <UrgencyTag urgency={o.urgency} />
        <span className="block truncate text-sm text-muted">{o.customer_name} · {o.description}</span>
      </span>
      <span className="text-sm">{o.workshop_name ?? <span className="font-semibold text-rust">Unassigned</span>}</span>
      <span><GateBadge gate={o.gate} source={o.source} /></span>
      <span><StatusPill status={o.status} /></span>
      <span className={`text-sm ${overdue ? "font-semibold text-rust" : "text-muted"}`}>{overdue ? "Overdue · " : ""}{fmtDate(o.expected_date ?? o.due_date)}</span>
    </Link>
  );
}

async function WorkshopBoard() {
  const s = await requireSession();
  const orders = await listOrders(s, { status: "all" });
  const cols: [string, string][] = [["not_started", "To do"], ["in_progress", "In progress"], ["done", "Done"]];
  return (
    <div>
      <h1 className="text-3xl font-semibold">My orders</h1>
      <p className="mt-1 text-muted">Urgent jobs first, then by due date. This page refreshes by itself.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {cols.map(([st, label]) => {
          const list = orders.filter((o) => o.status === st).slice(0, st === "done" ? 8 : 100);
          return (
            <section key={st}>
              <h2 className="mb-3 text-lg font-semibold">{label} <span className="text-muted">{orders.filter((o) => o.status === st).length}</span></h2>
              <div className="space-y-3">
                {list.map((o) => (
                  <div key={o.id} className={`card p-4 ${isOverdue(o) ? "border-l-4 border-l-rust" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/app/orders/${o.id}`} className="font-semibold hover:underline">#{o.number} · {o.item}</Link>
                      <UrgencyTag urgency={o.urgency} />
                    </div>
                    <p className="mt-1 text-sm">{o.description}</p>
                    <p className="mt-1 text-xs text-muted">
                      {o.customer_name} · {o.job_type} · effort {o.effort} · due {fmtDate(o.due_date)}
                      {isOverdue(o) && <span className="font-semibold text-rust"> · overdue</span>}
                    </p>
                    {st !== "done" && (
                      <div className="mt-3 space-y-2">
                        <StatusButtons id={o.id} status={o.status} compact />
                        <ExpectedDate id={o.id} value={o.expected_date} />
                      </div>
                    )}
                  </div>
                ))}
                {!list.length && <p className="text-sm text-muted">Nothing here.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

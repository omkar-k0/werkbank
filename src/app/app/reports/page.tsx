import { requireOwner } from "@/lib/auth";
import { report } from "@/lib/repo";

export const metadata = { title: "Reports" };

export default async function Reports() {
  const s = await requireOwner();
  const r = await report(s);
  const max = Math.max(1, ...r.monthly.map((m) => m.n));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <a href="/api/export" className="btn btn-ghost">Export all orders (CSV for Excel)</a>
      </div>

      <section className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sawdust text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-2">Workshop</th><th className="px-4 py-2 text-right">Open</th><th className="px-4 py-2 text-right">Overdue</th><th className="px-4 py-2 text-right">Done</th><th className="px-4 py-2 text-right">Avg. turnaround</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.perWorkshop.map((w) => (
              <tr key={w.name}>
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{w.open}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${w.overdue ? "font-semibold text-rust" : ""}`}>{w.overdue}</td>
                <td className="px-4 py-3 text-right tabular-nums">{w.done}</td>
                <td className="px-4 py-3 text-right tabular-nums">{w.avg_days === null ? "—" : `${w.avg_days} days`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Orders per month</h2>
          <div className="mt-4 flex h-44 items-end gap-3">
            {r.monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-muted">{m.n}</span>
                <div className="w-full rounded-t bg-walnut" style={{ height: `${(m.n / max) * 130}px` }} />
                <span className="text-xs text-muted">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
              </div>
            ))}
            {!r.monthly.length && <p className="text-muted">No orders yet.</p>}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-semibold">How routing is going</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div><dt className="text-sm text-muted">Orders routed with no human</dt><dd className="display text-3xl font-semibold">{Math.round(r.autoShare * 100)}%</dd></div>
            <div><dt className="text-sm text-muted">Corrections the model learned from</dt><dd className="display text-3xl font-semibold">{r.corrections}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-muted">
            Every time you assign a review-queue order or move a wrong one, your shop&apos;s model is retrained on it.
            In testing, about 100 corrections were enough for a shop with its own vocabulary to auto-route most orders.
          </p>
        </section>
      </div>
    </div>
  );
}

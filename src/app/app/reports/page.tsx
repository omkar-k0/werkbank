import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { dateLocale } from "@/lib/i18n";
import { getT, titleOf } from "@/lib/i18n/server";
import { report } from "@/lib/repo";

export const generateMetadata = () => titleOf("reports.title");

export default async function Reports() {
  const s = await requireOwner();
  const { t, locale } = await getT();
  const r = await report(s);
  const max = Math.max(1, ...r.monthly.map((m) => m.n));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("reports.title")}</h1>
        <a href="/api/export" className="btn btn-ghost">{t("reports.export")}</a>
      </div>

      {r.total === 0 && (
        <section className="card mt-6 p-7">
          <h2 className="text-2xl">{t("reports.emptyH")}</h2>
          <p className="mt-2 max-w-xl text-muted">{t("reports.emptyP")}</p>
          <Link href="/app/new" className="btn-text mt-4 inline-block">{t("nav.newOrder")} →</Link>
        </section>
      )}

      <section className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sawdust text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-2">{t("reports.col.workshop")}</th><th className="px-4 py-2 text-right">{t("reports.col.open")}</th><th className="px-4 py-2 text-right">{t("reports.col.overdue")}</th><th className="px-4 py-2 text-right">{t("reports.col.done")}</th><th className="px-4 py-2 text-right">{t("reports.col.avg")}</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.perWorkshop.map((w) => (
              <tr key={w.name}>
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{w.open}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${w.overdue ? "font-semibold text-rust" : ""}`}>{w.overdue}</td>
                <td className="px-4 py-3 text-right tabular-nums">{w.done}</td>
                <td className="px-4 py-3 text-right tabular-nums">{w.avg_days === null ? "—" : t("reports.days", { n: Number(w.avg_days).toLocaleString(dateLocale(locale)) })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">{t("reports.perMonth")}</h2>
          <div className="mt-4 flex h-44 items-end gap-3">
            {r.monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-muted">{m.n}</span>
                <div className="w-full rounded-t bg-walnut" style={{ height: `${(m.n / max) * 130}px` }} />
                <span className="text-xs text-muted">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
              </div>
            ))}
            {!r.monthly.length && <p className="text-muted">{t("reports.noOrders")}</p>}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-semibold">{t("reports.routingH")}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div><dt className="text-sm text-muted">{t("reports.autoShare")}</dt><dd className="display text-3xl font-semibold">{Math.round(r.autoShare * 100)}%</dd></div>
            <div><dt className="text-sm text-muted">{t("reports.corrections")}</dt><dd className="display text-3xl font-semibold">{r.corrections}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-muted">
            {t("reports.explain")}
          </p>
        </section>
      </div>
    </div>
  );
}

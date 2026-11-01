import Link from "next/link";
import { ExpectedDate, StatusButtons } from "@/components/OrderActions";
import { GateBadge, StatusPill, UrgencyTag } from "@/components/badges";
import { fmtDate, isOverdue } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import type { Locale, TFn } from "@/lib/i18n";
import { getT, titleOf } from "@/lib/i18n/server";
import { involves, listOrders, listWorkshops, type OrderFilter, type OrderRow } from "@/lib/repo";

export const generateMetadata = () => titleOf("board.title");

export default async function Board({ searchParams }: { searchParams: Promise<{ ws?: string; status?: string; q?: string; tab?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  return s.role === "owner" ? <OwnerBoard sp={sp} /> : <WorkshopBoard tab={sp.tab} />;
}

// Server component, so reading the clock per request is intended.
const daysAgoIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const COLS = "md:grid-cols-[3.5rem_minmax(0,1.7fr)_minmax(0,1.1fr)_9rem_8rem_5.5rem]";

async function OwnerBoard({ sp }: { sp: { ws?: string; status?: string; q?: string } }) {
  const s = await requireSession();
  const { t, locale } = await getT();
  const status = (["open", "done", "all"].includes(sp.status ?? "") ? sp.status : "open") as OrderFilter["status"];
  const [orders, all, workshops] = await Promise.all([
    listOrders(s, { status, workshopId: sp.ws, q: sp.q }),
    listOrders(s, { status: "all" }),
    listWorkshops(s),
  ]);
  const open = all.filter((o) => o.status !== "done");
  const weekAgo = daysAgoIso(7);
  const kpis = [
    [t("board.kpi.open"), open.length, ""],
    [t("board.kpi.overdue"), open.filter(isOverdue).length, "text-rust"],
    [t("board.kpi.review"), open.filter((o) => !o.workshop_id).length, ""],
    [t("board.kpi.doneWeek"), all.filter((o) => o.status === "done" && (o.completed_at ?? "") >= weekAgo).length, ""],
  ] as const;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ws: sp.ws, status: sp.status, q: sp.q, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/app${p.size ? `?${p}` : ""}`;
  };
  const chip = (on: boolean) => `rounded-md px-2.5 py-1 text-sm ${on ? "bg-sawdust font-medium text-walnut" : "text-muted hover:bg-sawdust/60 hover:text-ink"}`;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">{t("board.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("board.sub")}</p>
        </div>
        <Link href="/app/new" className="btn">{t("board.newOrder")}</Link>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        {kpis.map(([label, n, cls]) => (
          <div key={label}>
            <dd className={`display text-5xl leading-none ${cls}`}>{n}</dd>
            <dt className="mt-2 text-sm text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="inline-flex rounded-lg bg-sawdust p-0.5 text-sm">
          {(["open", "done", "all"] as const).map((st) => (
            <Link key={st} href={qs({ status: st === "open" ? undefined : st })} className={`rounded-md px-3 py-1 capitalize ${status === st ? "bg-card font-medium shadow-[0_0_0_1px_var(--line)]" : "text-muted hover:text-ink"}`}>{t(`board.filter.${st}`)}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Link href={qs({ ws: undefined })} className={chip(!sp.ws)}>{t("board.allWorkshops")}</Link>
          {workshops.map((w) => (
            <Link key={w.id} href={qs({ ws: w.id })} className={chip(sp.ws === w.id)}>
              {w.name} <span className="text-muted">{open.filter((o) => involves(o, w.id)).length}</span>
            </Link>
          ))}
        </div>
        <form className="ml-auto" action="/app">
          {sp.ws && <input type="hidden" name="ws" value={sp.ws} />}
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input name="q" defaultValue={sp.q} placeholder={t("board.searchPh")} className="input w-56 py-1.5 text-sm" />
        </form>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className={`hidden gap-3 border-b border-line px-5 py-2.5 md:grid ${COLS}`}>
          <span className="eyebrow">#</span><span className="eyebrow">{t("board.col.order")}</span><span className="eyebrow">{t("board.col.workshop")}</span><span className="eyebrow">{t("board.col.routing")}</span><span className="eyebrow">{t("board.col.status")}</span><span className="eyebrow text-right">{t("board.col.due")}</span>
        </div>
        {orders.length === 0 && <p className="p-6 text-muted">{t("board.empty")}</p>}
        <div className="divide-y divide-line">
          {orders.map((o) => <Row key={o.id} o={o} t={t} locale={locale} />)}
        </div>
        {orders.length > 0 && <div className="border-t border-line px-5 py-2.5 text-xs text-muted">{t("board.count", { n: orders.length })}</div>}
      </div>
    </div>
  );
}

function Row({ o, t, locale }: { o: OrderRow; t: TFn; locale: Locale }) {
  const overdue = isOverdue(o);
  return (
    <Link href={`/app/orders/${o.id}`} className={`grid gap-1 px-5 py-3.5 hover:bg-sawdust/50 md:items-center md:gap-3 ${COLS} ${overdue ? "border-l-[3px] border-l-rust pl-[17px]" : ""}`}>
      <span className="text-sm tabular-nums text-muted">#{o.number}</span>
      <span className="min-w-0">
        <span className="font-medium">{o.item}</span> <UrgencyTag urgency={o.urgency} />
        <span className="block truncate text-sm text-muted">{o.customer_name} · {o.description}</span>
      </span>
      <span className="text-sm">{o.parts.length ? o.parts.map((p) => p.workshop_name).join(" + ") : (o.workshop_name ?? <span className="font-medium text-rust">{t("common.unassigned")}</span>)}</span>
      <span><GateBadge gate={o.gate} source={o.source} /></span>
      <span><StatusPill status={o.status} /></span>
      <span className={`text-sm md:text-right ${overdue ? "text-rust" : "text-muted"}`}>
        {fmtDate(o.expected_date ?? o.due_date, locale)}
        {overdue && <span className="block text-xs">{t("common.overdue")}</span>}
      </span>
    </Link>
  );
}

const TABS = ["not_started", "in_progress", "done"] as const;

// Phone first: three tabs and one column of big cards. From lg up all three columns show side by side.
async function WorkshopBoard({ tab }: { tab?: string }) {
  const s = await requireSession();
  const { t, locale } = await getT();
  const labels = { job: (v: string) => (["repair", "custom", "refurbish", "assembly"].includes(v) ? t(`job.${v as "repair"}`) : v) };
  const orders = await listOrders(s, { status: "all" });
  const active = (TABS as readonly string[]).includes(tab ?? "") ? (tab as (typeof TABS)[number]) : "not_started";
  const names: Record<(typeof TABS)[number], string> = { not_started: t("ws.todo"), in_progress: t("status.in_progress"), done: t("status.done") };
  const count = (st: string) => orders.filter((o) => o.status === st).length;
  return (
    <div>
      <h1 className="text-4xl">{t("ws.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("ws.lead")}</p>

      <nav className="mt-6 flex rounded-lg bg-sawdust p-0.5 text-sm lg:hidden" aria-label={t("ws.title")}>
        {TABS.map((st) => (
          <Link key={st} href={`/app?tab=${st}`} replace className={`flex-1 rounded-md px-3 py-2.5 text-center ${active === st ? "bg-card font-medium shadow-[0_0_0_1px_var(--line)]" : "text-muted"}`}>
            {names[st]} <span className="text-muted">{count(st)}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {TABS.map((st) => {
          const list = orders.filter((o) => o.status === st).slice(0, st === "done" ? 8 : 100);
          return (
            <section key={st} className={`${active === st ? "" : "hidden"} lg:block`}>
              <h2 className="mb-3 hidden text-xl lg:block">{names[st]} <span className="text-muted">{count(st)}</span></h2>
              <div className="space-y-3">
                {list.map((o) => (
                  <div key={o.id} className={`card p-5 ${isOverdue(o) ? "border-l-[3px] border-l-rust" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/app/orders/${o.id}`} className="text-base font-medium hover:underline">#{o.number} · {o.item}</Link>
                      <UrgencyTag urgency={o.urgency} />
                    </div>
                    <p className="mt-2 text-[15px] leading-snug">{o.description}</p>
                    <p className="mt-2 text-xs text-muted">
                      {t("ws.meta", { customer: o.customer_name, job: labels.job(o.job_type), effort: o.effort, due: fmtDate(o.due_date, locale) })}
                      {isOverdue(o) && <span className="text-rust">{t("ws.overdue")}</span>}
                    </p>
                    {o.parts.length > 0 && (
                      <p className="mt-1 text-xs text-walnut">{t("order.sharedWith", { ws: o.parts.filter((p) => p.workshop_id !== s.workshopId).map((p) => p.workshop_name).join(", ") })}</p>
                    )}
                    {st !== "done" && (
                      <div className="mt-4 space-y-3">
                        <StatusButtons id={o.id} status={o.status} compact />
                        <ExpectedDate id={o.id} value={o.expected_date} />
                      </div>
                    )}
                  </div>
                ))}
                {!list.length && <p className="text-sm text-muted">{t("ws.nothing")}</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

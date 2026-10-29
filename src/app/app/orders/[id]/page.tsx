import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignSelect, ExpectedDate, JobTypeSelect, SplitPicker, StatusButtons, UnsplitButton } from "@/components/OrderActions";
import { GateBadge, ProbabilityBars, StatusPill, UrgencyTag } from "@/components/badges";
import { fmtDate, isOverdue, pctLabel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { dateLocale, splitAt } from "@/lib/i18n";
import { localizeEvent, localizeReason } from "@/lib/i18n/dynamic";
import { getT, titleOf } from "@/lib/i18n/server";
import { getOrder, listWorkshops, orderEvents } from "@/lib/repo";
import type { Capability } from "@/lib/classifier/types";

export const generateMetadata = () => titleOf("order.title");

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { t, locale } = await getT();
  const job = (v: string) => (["repair", "custom", "refurbish", "assembly"].includes(v) ? t(`job.${v as "repair"}`) : v);
  const urgency = (v: string) => (["high", "normal", "low"].includes(v) ? t(`urgencyVal.${v as "high"}`) : v);
  const { id } = await params;
  const o = await getOrder(s, id);
  if (!o) notFound();
  const [events, workshops] = await Promise.all([orderEvents(s, id), listWorkshops(s)]);
  const top = (Object.entries(o.probabilities) as [Capability, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
  const suggested = workshops.find((w) => w.capabilities.includes(o.capability ?? top))?.id ?? null;
  const also = splitAt(t, "order.alsoInvolves", "cap");
  const labels = o.labels as { urgencyCues?: string[]; effortCues?: string[]; jobTypeConfidence?: number };
  return (
    <div>
      <Link href="/app" className="text-sm text-muted hover:underline">{t("order.back")}</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">#{o.number} · {o.item}</h1>
        <StatusPill status={o.status} />
        <UrgencyTag urgency={o.urgency} />
        {isOverdue(o) && <span className="rounded-full bg-rust-bg px-2 py-0.5 text-xs font-semibold text-rust">{t("common.overdue")}</span>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <p className="text-lg">{o.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">{t("order.customer")}</dt><dd className="font-medium">{o.customer_name}</dd></div>
              <div><dt className="text-muted">{t("order.phone")}</dt><dd className="font-medium">{o.customer_phone ?? "—"}</dd></div>
              <div><dt className="text-muted">{t("order.customerDue")}</dt><dd className="font-medium">{fmtDate(o.due_date, locale)}</dd></div>
              <div><dt className="text-muted">{t("order.received")}</dt><dd className="font-medium">{fmtDate(o.created_at, locale)}</dd></div>
              <div><dt className="text-muted">{t("order.jobType")}</dt><dd>{s.role === "owner" ? <JobTypeSelect id={o.id} value={o.job_type} workshopId={o.workshop_id} /> : <span className="font-medium capitalize">{job(o.job_type)}</span>}</dd></div>
              <div><dt className="text-muted">{t("order.effort")}</dt><dd className="font-medium">{o.effort}</dd></div>
              <div><dt className="text-muted">{t("order.urgency")}</dt><dd className="font-medium capitalize">{urgency(o.urgency)}</dd></div>
              <div><dt className="text-muted">{t("order.workshop")}</dt><dd className="font-medium">{o.parts.length ? o.parts.map((p) => p.workshop_name).join(" + ") : (o.workshop_name ?? t("common.unassigned"))}</dd></div>
            </dl>
            {!!labels.urgencyCues?.length && <p className="mt-3 text-xs text-muted">{t("order.urgentBecause", { cues: labels.urgencyCues.join(", ") })}</p>}
          </section>

          {o.workshop_id && (
            <section className="card space-y-3 p-6">
              <h2 className="text-lg font-semibold">{t("order.progress")}</h2>
              {o.parts.length ? (
                <>
                  {s.role === "workshop" && <p className="text-sm text-muted">{t("order.sharedWith", { ws: o.parts.filter((p) => p.workshop_id !== s.workshopId).map((p) => p.workshop_name).join(", ") })}</p>}
                  {o.parts.filter((p) => s.role === "owner" || p.workshop_id === s.workshopId).map((p) => (
                    <div key={p.id} className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0">
                      <div className="flex items-center gap-2"><span className="font-semibold">{p.workshop_name}</span><StatusPill status={p.status} /></div>
                      {p.note && <p className="text-sm text-muted">{p.note}</p>}
                      <StatusButtons id={o.id} status={p.status} workshopId={s.role === "owner" ? p.workshop_id : undefined} />
                      <ExpectedDate id={o.id} value={p.expected_date} workshopId={s.role === "owner" ? p.workshop_id : undefined} />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <StatusButtons id={o.id} status={o.status} />
                  <ExpectedDate id={o.id} value={o.expected_date} />
                </>
              )}
            </section>
          )}

          {s.role === "owner" && (
            <section className="card p-6">
              <h2 className="text-lg font-semibold">{o.workshop_id ? t("order.moveTitle") : t("order.assignTitle")}</h2>
              <p className="mb-3 text-sm text-muted">{t("order.moveHint")}</p>
              <AssignSelect id={o.id} current={o.workshop_id} workshops={workshops} suggested={suggested} />
            </section>
          )}

          {s.role === "owner" && o.workshop_id && (
            <section className="card p-6">
              <h2 className="text-lg font-semibold">{t("order.splitH")}</h2>
              <p className="mb-3 text-sm text-muted">{t("order.splitHint")}</p>
              {o.parts.length ? (
                <UnsplitButton id={o.id} name={o.parts.find((p) => !p.is_primary)!.workshop_name} />
              ) : (
                <SplitPicker id={o.id} workshops={workshops.filter((w) => w.id !== o.workshop_id)} suggested={workshops.find((w) => w.id !== o.workshop_id && o.secondary && w.capabilities.includes(o.secondary))?.id} />
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("order.why")}</h2>
              <GateBadge gate={o.gate} source={o.source} />
            </div>
            <p className="mt-2 text-sm text-muted">{localizeReason(locale, o.reason)}</p>
            {o.llm_quote && <blockquote className="mt-2 border-l-2 border-walnut pl-3 text-sm italic">“{o.llm_quote}”</blockquote>}
            <div className="mt-4"><ProbabilityBars probabilities={o.probabilities} chosen={o.capability ?? top} /></div>
            <p className="mt-2 text-xs text-muted">{t("order.confidence", { pct: pctLabel(o.confidence) })}</p>
            {!!o.evidence.length && (
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {o.evidence.slice(0, 10).map((e) => (
                  <span key={e.token} className="rounded bg-sawdust px-1.5 py-0.5">“{e.token}” → {t(`capShort.${e.capability}`)}</span>
                ))}
              </div>
            )}
            {o.secondary && <p className="mt-3 text-sm">{also[0]}<b>{t(`capShort.${o.secondary}`)}</b>{also[1]}</p>}
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">{t("order.history")}</h2>
            <ol className="mt-3 space-y-3 border-l border-line pl-4 text-sm">
              {events.map((e, i) => (
                <li key={i}>
                  <div>{localizeEvent(locale, e.detail)}</div>
                  <div className="text-xs text-muted">{e.actor === "system" ? t("event.actorSystem") : e.actor} · {new Date(e.at).toLocaleString(dateLocale(locale), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignSelect, ExpectedDate, JobTypeSelect, StatusButtons } from "@/components/OrderActions";
import { CAP_SHORT, fmtDate, GateBadge, isOverdue, pctLabel, ProbabilityBars, StatusPill, UrgencyTag } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { getOrder, listWorkshops, orderEvents } from "@/lib/repo";
import type { Capability } from "@/lib/classifier/types";

export const metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const o = await getOrder(s, id);
  if (!o) notFound();
  const [events, workshops] = await Promise.all([orderEvents(s, id), listWorkshops(s)]);
  const top = (Object.entries(o.probabilities) as [Capability, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
  const suggested = workshops.find((w) => w.capabilities.includes(o.capability ?? top))?.id ?? null;
  const labels = o.labels as { urgencyCues?: string[]; effortCues?: string[]; jobTypeConfidence?: number };
  return (
    <div>
      <Link href="/app" className="text-sm text-muted hover:underline">← Board</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">#{o.number} · {o.item}</h1>
        <StatusPill status={o.status} />
        <UrgencyTag urgency={o.urgency} />
        {isOverdue(o) && <span className="rounded-full bg-rust-bg px-2 py-0.5 text-xs font-semibold text-rust">Overdue</span>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <p className="text-lg">{o.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Customer</dt><dd className="font-medium">{o.customer_name}</dd></div>
              <div><dt className="text-muted">Phone</dt><dd className="font-medium">{o.customer_phone ?? "—"}</dd></div>
              <div><dt className="text-muted">Customer due</dt><dd className="font-medium">{fmtDate(o.due_date)}</dd></div>
              <div><dt className="text-muted">Received</dt><dd className="font-medium">{fmtDate(o.created_at)}</dd></div>
              <div><dt className="text-muted">Job type</dt><dd>{s.role === "owner" ? <JobTypeSelect id={o.id} value={o.job_type} workshopId={o.workshop_id} /> : <span className="font-medium capitalize">{o.job_type}</span>}</dd></div>
              <div><dt className="text-muted">Effort</dt><dd className="font-medium">{o.effort}</dd></div>
              <div><dt className="text-muted">Urgency</dt><dd className="font-medium capitalize">{o.urgency}</dd></div>
              <div><dt className="text-muted">Workshop</dt><dd className="font-medium">{o.workshop_name ?? "Unassigned"}</dd></div>
            </dl>
            {!!labels.urgencyCues?.length && <p className="mt-3 text-xs text-muted">Marked urgent because: {labels.urgencyCues.join(", ")}</p>}
          </section>

          {o.workshop_id && (
            <section className="card space-y-3 p-6">
              <h2 className="text-lg font-semibold">Progress</h2>
              <StatusButtons id={o.id} status={o.status} />
              <ExpectedDate id={o.id} value={o.expected_date} />
            </section>
          )}

          {s.role === "owner" && (
            <section className="card p-6">
              <h2 className="text-lg font-semibold">{o.workshop_id ? "Move to another workshop" : "Assign to a workshop"}</h2>
              <p className="mb-3 text-sm text-muted">If the routing was wrong, moving it teaches your shop&apos;s model.</p>
              <AssignSelect id={o.id} current={o.workshop_id} workshops={workshops} suggested={suggested} />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Why it went there</h2>
              <GateBadge gate={o.gate} source={o.source} />
            </div>
            <p className="mt-2 text-sm text-muted">{o.reason}</p>
            {o.llm_quote && <blockquote className="mt-2 border-l-2 border-walnut pl-3 text-sm italic">“{o.llm_quote}”</blockquote>}
            <div className="mt-4"><ProbabilityBars probabilities={o.probabilities} chosen={o.capability ?? top} /></div>
            <p className="mt-2 text-xs text-muted">Model confidence at intake: {pctLabel(o.confidence)}</p>
            {!!o.evidence.length && (
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {o.evidence.slice(0, 10).map((e) => (
                  <span key={e.token} className="rounded bg-sawdust px-1.5 py-0.5">“{e.token}” → {CAP_SHORT[e.capability]}</span>
                ))}
              </div>
            )}
            {o.secondary && <p className="mt-3 text-sm">Also involves <b>{CAP_SHORT[o.secondary]}</b>.</p>}
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">History</h2>
            <ol className="mt-3 space-y-3 border-l border-line pl-4 text-sm">
              {events.map((e, i) => (
                <li key={i}>
                  <div>{e.detail}</div>
                  <div className="text-xs text-muted">{e.actor} · {new Date(e.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

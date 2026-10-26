import Link from "next/link";
import { AssignSelect } from "@/components/OrderActions";
import { CAP_SHORT, fmtDate, pctLabel, UrgencyTag } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { listOrders, listWorkshops } from "@/lib/repo";
import type { Capability } from "@/lib/classifier/types";

export const metadata = { title: "Review queue" };

export default async function Review() {
  const s = await requireOwner();
  const [orders, workshops] = await Promise.all([listOrders(s, { gate: "review", status: "open" }), listWorkshops(s)]);
  return (
    <div>
      <h1 className="text-3xl font-semibold">Review queue</h1>
      <p className="mt-1 text-muted">
        Orders the system was not sure enough about. Each one you assign becomes a training example for your shop.
      </p>
      <div className="mt-6 space-y-3">
        {!orders.length && <div className="card p-6 text-muted">Nothing waiting. Every open order has a workshop.</div>}
        {orders.map((o) => {
          const ranked = (Object.entries(o.probabilities) as [Capability, number][]).sort((a, b) => b[1] - a[1]);
          const suggested = workshops.find((w) => w.capabilities.includes(ranked[0][0]))?.id;
          return (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/app/orders/${o.id}`} className="font-semibold hover:underline">#{o.number} · {o.item} <UrgencyTag urgency={o.urgency} /></Link>
                <span className="text-sm text-muted">{o.customer_name} · due {fmtDate(o.due_date)}</span>
              </div>
              <p className="mt-1">{o.description}</p>
              <p className="mt-1 text-sm text-muted">
                {o.reason} Best guesses: {ranked.slice(0, 2).map(([c, p]) => `${CAP_SHORT[c]} ${pctLabel(p)}`).join(", ")}.
              </p>
              <div className="mt-3"><AssignSelect id={o.id} current={null} workshops={workshops} suggested={suggested} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

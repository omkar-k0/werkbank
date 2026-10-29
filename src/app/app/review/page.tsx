import Link from "next/link";
import { AssignSelect } from "@/components/OrderActions";
import { UrgencyTag } from "@/components/badges";
import { fmtDate, pctLabel } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { localizeReason } from "@/lib/i18n/dynamic";
import { getT, titleOf } from "@/lib/i18n/server";
import { listOrders, listWorkshops } from "@/lib/repo";
import type { Capability } from "@/lib/classifier/types";

export const generateMetadata = () => titleOf("review.title");

export default async function Review() {
  const s = await requireOwner();
  const { t, locale } = await getT();
  const [orders, workshops] = await Promise.all([listOrders(s, { gate: "review", status: "open" }), listWorkshops(s)]);
  return (
    <div>
      <h1 className="text-3xl font-semibold">{t("review.title")}</h1>
      <p className="mt-1 text-muted">
        {t("review.lead")}
      </p>
      <div className="mt-6 space-y-3">
        {!orders.length && <div className="card p-6 text-muted">{t("review.empty")}</div>}
        {orders.map((o) => {
          const ranked = (Object.entries(o.probabilities) as [Capability, number][]).sort((a, b) => b[1] - a[1]);
          const suggested = workshops.find((w) => w.capabilities.includes(ranked[0][0]))?.id;
          return (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/app/orders/${o.id}`} className="font-semibold hover:underline">#{o.number} · {o.item} <UrgencyTag urgency={o.urgency} /></Link>
                <span className="text-sm text-muted">{t("review.due", { customer: o.customer_name, due: fmtDate(o.due_date, locale) })}</span>
              </div>
              <p className="mt-1">{o.description}</p>
              <p className="mt-1 text-sm text-muted">
                {localizeReason(locale, o.reason)} {t("review.guesses", { list: ranked.slice(0, 2).map(([c, p]) => `${t(`capShort.${c}`)} ${pctLabel(p)}`).join(", ") })}
              </p>
              <div className="mt-3"><AssignSelect id={o.id} current={null} workshops={workshops} suggested={suggested} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

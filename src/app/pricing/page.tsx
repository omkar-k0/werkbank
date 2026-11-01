import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { getT, titleOf } from "@/lib/i18n/server";

export const generateMetadata = () => titleOf("pricing.title");

const PLAN_IDS = ["starter", "pro", "lifetime"] as const;

const FEATURES = {
  starter: ["plan.starter.f1", "plan.starter.f2", "plan.starter.f3", "plan.starter.f4", "plan.starter.f5", "plan.starter.f6"],
  pro: ["plan.pro.f1", "plan.pro.f2", "plan.pro.f3", "plan.pro.f4", "plan.pro.f5", "plan.pro.f6"],
  lifetime: ["plan.lifetime.f1", "plan.lifetime.f2", "plan.lifetime.f3", "plan.lifetime.f4", "plan.lifetime.f5"],
} as const;

export default async function Pricing() {
  const { t } = await getT();
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t("pricing.h1")}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          {t("pricing.lead")}
        </p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLAN_IDS.map((id) => {
            const highlight = id === "pro";
            return (
            <div key={id} className={`card flex flex-col p-6 ${highlight ? "ring-2 ring-walnut" : ""}`}>
              {highlight && <span className="mb-2 self-start rounded-full bg-sawdust px-2 py-0.5 text-xs font-medium text-walnut">{t("pricing.mostShops")}</span>}
              <h2 className="text-2xl font-semibold">{t(`plan.${id}.name`)}</h2>
              <p className="text-muted">{t(`plan.${id}.blurb`)}</p>
              <div className="mt-4">
                <span className="display text-4xl font-semibold">{t(`plan.${id}.price`)}</span> <span className="text-muted">{t(`plan.${id}.unit`)}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {FEATURES[id].map((k) => (
                  <li key={k} className="flex gap-2"><span className="text-moss">✓</span>{t(k)}</li>
                ))}
              </ul>
              <Link href={`/signup?plan=${id}`} className={`btn mt-6 ${highlight ? "" : "btn-ghost"}`}>{t("pricing.cta")}</Link>
            </div>
            );
          })}
        </div>
        <p className="mt-8 text-sm text-muted">
          {t("pricing.note")}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

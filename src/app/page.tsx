import Link from "next/link";
import evalReport from "../../reports/eval.json";
import { DemoButton } from "@/components/DemoButtons";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { TryIt } from "@/components/TryIt";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  const { t } = await getT();
  const pct = (x: number | null) => (x === null ? t("common.na") : `${Math.round(x * 100)}%`);
  const h = evalReport.handwritten;
  const curve = evalReport.curve;
  const at100 = curve.find((c) => c.corrections === 100)!;
  const at0 = curve.find((c) => c.corrections === 0)!;
  return (
    <div className="grain">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-start gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-walnut">{t("home.kicker")}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] sm:text-6xl">
              {t("home.h1a")}
              <span className="block text-walnut">{t("home.h1b")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              {t("home.lead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <DemoButton label={t("home.openDemo")} />
              <DemoButton as="demo-ws-upholstery" label={t("home.workshopView")} className="btn btn-ghost" />
            </div>
            <p className="mt-3 text-sm text-muted">{t("home.noSignup")}</p>
          </div>
          <TryIt />
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="card p-6">
              <h3 className="text-xl font-semibold">{t(`home.step${n}.t`)}</h3>
              <p className="mt-2 text-muted">{t(`home.step${n}.d`)}</p>
            </div>
          ))}
        </section>

        <section className="py-10">
          <h2 className="text-3xl font-semibold">{t("home.measured")}</h2>
          <p className="mt-2 max-w-2xl text-muted">
            {t("home.measuredLead")}{" "}
            <a className="underline" href="https://github.com/omkar-k0/werkbank/blob/main/reports/eval.md">{t("home.fullReport")}</a>.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [pct(h.autoAcc), t("home.stat1.label"), t("home.stat1.sub", { rate: pct(h.autoRate) })],
              [pct(h.reviewRate), t("home.stat2.label"), t("home.stat2.sub")],
              [`${pct(at0.autoRate)} → ${pct(at100.autoRate)}`, t("home.stat3.label"), t("home.stat3.sub")],
              [pct(at100.autoAcc), t("home.stat4.label"), t("home.stat4.sub")],
            ].map(([big, label, sub]) => (
              <div key={label} className="card p-5">
                <div className="display text-3xl font-semibold text-walnut">{big}</div>
                <div className="mt-1 font-medium">{label}</div>
                <div className="text-sm text-muted">{sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 py-10 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="text-xl font-semibold">{t("home.owner.h")}</h3>
            <ul className="mt-3 space-y-2 text-muted">
              {(["1", "2", "3", "4"] as const).map((n) => <li key={n}>{t(`home.owner.${n}`)}</li>)}
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="text-xl font-semibold">{t("home.ws.h")}</h3>
            <ul className="mt-3 space-y-2 text-muted">
              {(["1", "2", "3", "4"] as const).map((n) => <li key={n}>{t(`home.ws.${n}`)}</li>)}
            </ul>
          </div>
        </section>

        <section className="py-12 text-center">
          <h2 className="text-3xl font-semibold">{t("home.cta.h")}</h2>
          <p className="mt-2 text-muted">{t("home.cta.p")}</p>
          <Link href="/pricing" className="btn mt-6">{t("home.cta.btn")}</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

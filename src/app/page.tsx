import Link from "next/link";
import evalReport from "../../reports/eval.json";
import { DemoButton } from "@/components/DemoButtons";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { TryIt } from "@/components/TryIt";
import { getT } from "@/lib/i18n/server";

// One decimal, and never "100%": a measured number is not a promise.
const pct = (x: number) => {
  const v = Math.min(Math.round(x * 1000) / 10, 99.9);
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
};

export default async function Home() {
  const { t } = await getT();
  const h = evalReport.handwritten;
  const at100 = evalReport.curve.find((c) => c.corrections === 100)!;
  const at0 = evalReport.curve.find((c) => c.corrections === 0)!;
  const stats = [
    [pct(h.autoAcc), t("home.stat1.label"), t("home.stat1.sub")],
    [pct(h.autoRate), t("home.stat2.label"), t("home.stat2.sub", { review: pct(h.reviewRate) })],
    [pct(at100.autoRate), t("home.stat3.label"), t("home.stat3.sub", { from: pct(at0.autoRate) })],
    [pct(at100.autoAcc), t("home.stat4.label"), t("home.stat4.sub")],
  ];
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-[1120px] px-5">
        <section className="py-16 text-center lg:py-24">
          <p className="eyebrow">{t("home.kicker")}</p>
          <h1 className="mx-auto mt-5 max-w-4xl text-5xl leading-[1.08] lg:text-6xl">
            {t("home.h1a")}
            <span className="block text-muted">{t("home.h1b")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">{t("home.lead")}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
            <DemoButton label={t("home.openDemo")} className="btn px-6 py-3 text-base" />
            <DemoButton as="demo-ws-upholstery" label={t("home.workshopView")} className="btn-text" />
          </div>
          <p className="mt-4 text-sm text-muted">{t("home.noSignup")}</p>
        </section>

        <section className="mx-auto max-w-3xl pb-8">
          <TryIt />
        </section>

        <section className="grid gap-10 py-20 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <div key={n}>
              <p className="eyebrow">0{n}</p>
              <h3 className="mt-2 text-2xl">{t(`home.step${n}.t`)}</h3>
              <p className="mt-2 text-muted">{t(`home.step${n}.d`)}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-line py-16">
          <h2 className="text-3xl">{t("home.measured")}</h2>
          <p className="mt-2 max-w-2xl text-muted">{t("home.measuredLead")}</p>
          <dl className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([big, label, sub]) => (
              <div key={label}>
                <dd className="display text-5xl leading-none">{big}</dd>
                <dt className="mt-3 font-medium">{label}</dt>
                <p className="mt-1 text-sm text-muted">{sub}</p>
              </div>
            ))}
          </dl>
          <a className="btn-text mt-8 inline-block" href="https://github.com/omkar-k0/werkbank/blob/main/reports/eval.md">{t("home.fullReport")} →</a>
        </section>

        <section className="border-t border-line py-20 text-center">
          <h2 className="text-3xl">{t("home.cta.h")}</h2>
          <p className="mt-2 text-muted">{t("home.cta.p")}</p>
          <Link href="/pricing" className="btn-text mt-5 inline-block">{t("home.cta.btn")} →</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

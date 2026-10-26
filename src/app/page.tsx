import Link from "next/link";
import evalReport from "../../reports/eval.json";
import { DemoButton } from "@/components/DemoButtons";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { TryIt } from "@/components/TryIt";

const pct = (x: number | null) => (x === null ? "n/a" : `${Math.round(x * 100)}%`);

export default function Home() {
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-walnut">For furniture shops with their own workshops</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] sm:text-6xl">
              Every order to the right workshop.
              <span className="block text-walnut">And it says when it isn&apos;t sure.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Type the customer&apos;s request the way you would write it on a job slip. Werkbank sends it to carpentry,
              upholstery, polish or metalwork, sorts it by job type and urgency, and shows its confidence. Anything
              unclear waits for you instead of landing in the wrong workshop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <DemoButton label="Open the demo shop" />
              <DemoButton as="demo-ws-upholstery" label="See a workshop's view" className="btn btn-ghost" />
            </div>
            <p className="mt-3 text-sm text-muted">No sign-up needed. The demo shop is fictional.</p>
          </div>
          <TryIt />
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-3">
          {[
            ["1. Cheap layer first", "A keyword layer and a small learned model handle the clear cases in milliseconds. Every decision keeps the words that drove it."],
            ["2. Confidence gate", "High confidence goes straight to the workshop. Medium is routed but flagged. Low waits in your review queue. You choose how strict."],
            ["3. Learns your shop", "When you move an order, that becomes a training example for your shop only. Your staff's own words start to count."],
          ].map(([t, d]) => (
            <div key={t} className="card p-6">
              <h3 className="text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-muted">{d}</p>
            </div>
          ))}
        </section>

        <section className="py-10">
          <h2 className="text-3xl font-semibold">Measured, not promised</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Evaluated on requests the model never trained on. Training data is synthetic, so treat real-world numbers as
            unknown until a shop has used it.{" "}
            <a className="underline" href="https://github.com/krakmo1/werkbank/blob/main/reports/eval.md">Full report</a>.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [pct(h.autoAcc), "accuracy on auto-routed orders", `hand-written test set, ${pct(h.autoRate)} auto-routed`],
              [pct(h.reviewRate), "held back for a person", "instead of guessing"],
              [`${pct(at0.autoRate)} → ${pct(at100.autoRate)}`, "auto-routed after 100 corrections", "a shop whose staff phrase things differently"],
              [pct(at100.autoAcc), "accuracy after those corrections", "on 400 later orders"],
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
            <h3 className="text-xl font-semibold">What the owner gets</h3>
            <ul className="mt-3 space-y-2 text-muted">
              <li>One board with every order across all workshops, overdue ones highlighted</li>
              <li>A review queue for the unclear ones, with the model&apos;s best guess</li>
              <li>Turnaround, overdue and volume reports per workshop, plus Excel/CSV export</li>
              <li>Installs on phone and desktop like an app. Data is stored on our server, backed up</li>
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="text-xl font-semibold">What each workshop gets</h3>
            <ul className="mt-3 space-y-2 text-muted">
              <li>Its own login that only shows its own orders</li>
              <li>Urgent jobs on top, then by due date</li>
              <li>One tap to move a job to in progress or done, and an expected finish date</li>
              <li>The board refreshes by itself, no reloading</li>
            </ul>
          </div>
        </section>

        <section className="py-12 text-center">
          <h2 className="text-3xl font-semibold">Subscribe monthly, or buy it once.</h2>
          <p className="mt-2 text-muted">From €29 a month, or a one-time licence. 14 days free either way.</p>
          <Link href="/pricing" className="btn mt-6">See pricing</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

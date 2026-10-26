import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Pricing" };

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "€29",
    unit: "per month",
    blurb: "A small shop with a few workshops.",
    features: ["Up to 3 workshops and 6 logins", "300 orders a month", "Automatic routing with confidence gate", "Review queue and learning from corrections", "Web and installable app", "Daily backups on our server"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "€59",
    unit: "per month",
    blurb: "Busy shops with several workshops.",
    highlight: true,
    features: ["Unlimited workshops and logins", "Unlimited orders", "LLM second opinion for unclear orders, with a quoted reason", "Email alert when a job is done", "Reports and Excel/CSV export", "Priority support"],
  },
  {
    id: "lifetime",
    name: "Lifetime licence",
    price: "€790",
    unit: "one time",
    blurb: "Pay once, own your licence.",
    features: ["Everything in Pro, for one shop", "Hosting and backups included", "12 months of updates included", "Optional update plan afterwards: €149 a year", "Your data can be exported any time"],
  },
];

export default function Pricing() {
  return (
    <div className="grain min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-4xl font-semibold sm:text-5xl">Subscribe, or buy it once.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Every plan starts with 14 days free. No per-seat fees for workshop staff on Pro or Lifetime.
        </p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className={`card flex flex-col p-6 ${p.highlight ? "ring-2 ring-walnut" : ""}`}>
              {p.highlight && <span className="mb-2 self-start rounded-full bg-walnut px-2 py-0.5 text-xs font-semibold text-walnut-ink">Most shops</span>}
              <h2 className="text-2xl font-semibold">{p.name}</h2>
              <p className="text-muted">{p.blurb}</p>
              <div className="mt-4">
                <span className="display text-4xl font-semibold">{p.price}</span> <span className="text-muted">{p.unit}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-moss">✓</span>{f}</li>
                ))}
              </ul>
              <Link href={`/signup?plan=${p.id}`} className={`btn mt-6 ${p.highlight ? "" : "btn-ghost"}`}>Start 14-day trial</Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted">
          Prices exclude VAT. Payments are not connected in this portfolio build: choosing a plan only records it on your
          account.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

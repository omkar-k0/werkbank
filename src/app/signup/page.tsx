import { SiteHeader } from "@/components/SiteHeader";
import { googleEnabled } from "@/lib/google";
import { getT, titleOf } from "@/lib/i18n/server";

export const generateMetadata = () => titleOf("signup.title");

const PLAN_KEYS = { starter: "plan.starter.name", pro: "plan.pro.name", lifetime: "plan.lifetime.name" } as const;

// Owners create their shop by signing in with Google; the shop name travels with the sign-in request.
export default async function Signup({ searchParams }: { searchParams: Promise<{ plan?: string; error?: string }> }) {
  const { t } = await getT();
  const { plan = "trial", error } = await searchParams;
  const known = plan in PLAN_KEYS;
  const err = error === "shop" || error === "email" ? error : null;
  return (
    <div className="grain min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-3xl font-semibold">{t("signup.h1")}</h1>
        <p className="mt-1 text-muted">
          {t("signup.lead", { then: known ? t("signup.then", { plan: t(PLAN_KEYS[plan as keyof typeof PLAN_KEYS]) }) : "" })}
        </p>
        {err && <p className="mt-4 rounded-lg bg-rust-bg px-3 py-2 text-sm text-rust">{t(`signup.err.${err}`)}</p>}
        <form className="card mt-6 space-y-4 p-6" action="/api/auth/google/start" method="get">
          <input type="hidden" name="mode" value="signup" />
          <input type="hidden" name="plan" value={known ? plan : "trial"} />
          <label className="block">
            <span className="text-sm font-medium">{t("signup.shopName")}</span>
            <input className="input mt-1" name="shop" placeholder={t("signup.shopNamePh")} required minLength={2} maxLength={80} />
          </label>
          <button className="btn w-full" disabled={!googleEnabled()}>{t("signup.google")}</button>
          {!googleEnabled() && <p className="text-sm text-muted">{t("login.err.google_off")}</p>}
        </form>
      </main>
    </div>
  );
}

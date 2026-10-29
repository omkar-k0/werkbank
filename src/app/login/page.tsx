import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { DemoButton } from "@/components/DemoButtons";
import { SiteHeader } from "@/components/SiteHeader";
import { googleEnabled } from "@/lib/google";
import { getT, titleOf } from "@/lib/i18n/server";

export const generateMetadata = () => titleOf("login.title");

const ERRORS = ["google_off", "google_failed", "google_cancelled", "no_account"] as const;

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t } = await getT();
  const { error } = await searchParams;
  const err = ERRORS.find((e) => e === error);
  return (
    <div className="grain min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-3xl font-semibold">{t("login.title")}</h1>
        <p className="mt-1 text-muted">{t("login.lead")}</p>
        {err && <p className="mt-4 rounded-lg bg-rust-bg px-3 py-2 text-sm text-rust">{t(`login.err.${err}`)}</p>}
        <div className="card mt-6 space-y-3 p-6">
          <a href="/api/auth/google/start?mode=login" className={`btn w-full ${googleEnabled() ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!googleEnabled()}>
            {t("login.google")}
          </a>
          <p className="text-sm text-muted">{t("login.googleHint")}</p>
        </div>
        <div className="card mt-4 p-6">
          <h2 className="mb-3 text-lg font-semibold">{t("login.staffH")}</h2>
          <AuthForm
            endpoint="/api/auth/login"
            submit={t("login.title")}
            fields={[
              { name: "username", label: t("login.username"), autoComplete: "username" },
              { name: "password", label: t("login.password"), type: "password", autoComplete: "current-password" },
            ]}
          />
        </div>
        <div className="mt-6 space-y-2 text-sm text-muted">
          <p>{t("login.justLooking")} <DemoButton label={t("home.openDemo")} className="font-semibold text-walnut underline" /></p>
          <p>{t("login.newShop")} <Link className="font-semibold text-walnut underline" href="/signup">{t("login.startTrial")}</Link></p>
        </div>
      </main>
    </div>
  );
}

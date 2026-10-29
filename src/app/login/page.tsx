import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { DemoButton } from "@/components/DemoButtons";
import { SiteHeader } from "@/components/SiteHeader";
import { getT, titleOf } from "@/lib/i18n/server";

export const generateMetadata = () => titleOf("login.title");

export default async function Login() {
  const { t } = await getT();
  return (
    <div className="grain min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-3xl font-semibold">{t("login.title")}</h1>
        <p className="mt-1 text-muted">{t("login.lead")}</p>
        <div className="card mt-6 p-6">
          <AuthForm
            endpoint="/api/auth/login"
            submit={t("login.title")}
            fields={[
              { name: "email", label: t("login.email"), type: "email", autoComplete: "email" },
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

import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getT, titleOf } from "@/lib/i18n/server";

export const generateMetadata = () => titleOf("signup.title");

const PLAN_KEYS = { starter: "plan.starter.name", pro: "plan.pro.name", lifetime: "plan.lifetime.name" } as const;

export default async function Signup({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { t } = await getT();
  const { plan = "trial" } = await searchParams;
  const known = plan in PLAN_KEYS;
  return (
    <div className="grain min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-3xl font-semibold">{t("signup.h1")}</h1>
        <p className="mt-1 text-muted">
          {t("signup.lead", { then: known ? t("signup.then", { plan: t(PLAN_KEYS[plan as keyof typeof PLAN_KEYS]) }) : "" })}
        </p>
        <div className="card mt-6 p-6">
          <AuthForm
            endpoint="/api/auth/signup"
            submit={t("signup.submit")}
            extra={{ plan: known ? plan : "trial" }}
            fields={[
              { name: "shopName", label: t("signup.shopName"), placeholder: t("signup.shopNamePh") },
              { name: "name", label: t("signup.yourName"), autoComplete: "name" },
              { name: "email", label: t("login.email"), type: "email", autoComplete: "email" },
              { name: "password", label: t("signup.password"), type: "password", autoComplete: "new-password" },
            ]}
          />
        </div>
      </main>
    </div>
  );
}

import { DemoButton } from "@/components/DemoButtons";
import { PlanSelect, ResetDemo, StrictnessForm } from "@/components/SettingsForm";
import { requireOwner } from "@/lib/auth";
import { llmEnabled } from "@/lib/classifier";
import { getT, titleOf } from "@/lib/i18n/server";
import { getShop, listWorkshops } from "@/lib/repo";

export const generateMetadata = () => titleOf("settings.title");

export default async function Settings() {
  const s = await requireOwner();
  const { t } = await getT();
  const [shop, workshops] = await Promise.all([getShop(s), listWorkshops(s)]);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">{t("settings.title")}</h1>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">{t("settings.strictH")}</h2>
        <p className="mb-4 text-sm text-muted">{t("settings.strictHelp")}</p>
        <StrictnessForm value={shop.strictness} />
        <p className="mt-4 text-sm text-muted">
          {t("settings.llm")} <b>{llmEnabled() ? t("settings.llmOn") : t("settings.llmOff")}</b>.
          {llmEnabled() ? t("settings.llmOnNote") : t("settings.llmOffNote")}
        </p>
      </section>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">{t("settings.planH")}</h2>
        <p className="mb-3 text-sm text-muted">{t("settings.planNote")}</p>
        <PlanSelect value={shop.plan} />
      </section>
      {shop.is_demo && (
        <section className="card space-y-3 p-6">
          <h2 className="text-lg font-semibold">{t("settings.demoH")}</h2>
          <p className="text-sm text-muted">{t("settings.demoSee")}</p>
          <div className="flex flex-wrap gap-2">
            {workshops.map((w) => <DemoButton key={w.id} as={w.id} label={w.name} className="btn btn-ghost" />)}
          </div>
          <ResetDemo />
        </section>
      )}
    </div>
  );
}

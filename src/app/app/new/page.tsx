import { NewOrderForm } from "@/components/NewOrderForm";
import { requireOwner } from "@/lib/auth";
import { llmEnabled } from "@/lib/classifier";
import { getT, titleOf } from "@/lib/i18n/server";

export const generateMetadata = () => titleOf("new.title");

export default async function NewOrder() {
  await requireOwner();
  const { t } = await getT();
  return (
    <div>
      <h1 className="text-3xl font-semibold">{t("new.title")}</h1>
      <p className="mt-1 mb-6 text-muted">{t("new.lead")}</p>
      <NewOrderForm llm={llmEnabled()} />
    </div>
  );
}

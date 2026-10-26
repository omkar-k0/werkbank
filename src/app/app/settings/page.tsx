import { DemoButton } from "@/components/DemoButtons";
import { PlanSelect, ResetDemo, StrictnessForm } from "@/components/SettingsForm";
import { requireOwner } from "@/lib/auth";
import { llmEnabled } from "@/lib/classifier";
import { getShop, listWorkshops } from "@/lib/repo";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const s = await requireOwner();
  const [shop, workshops] = await Promise.all([getShop(s), listWorkshops(s)]);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">How strict is the router?</h2>
        <p className="mb-4 text-sm text-muted">Decides how sure the system must be before an order skips your review queue.</p>
        <StrictnessForm value={shop.strictness} />
        <p className="mt-4 text-sm text-muted">
          LLM second opinion for unclear orders: <b>{llmEnabled() ? "on" : "off"}</b>.
          {llmEnabled() ? " It must quote the request; if the quote isn't in the text, its answer is thrown away." : " Set ANTHROPIC_API_KEY on the server to turn it on."}
        </p>
      </section>
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Plan</h2>
        <p className="mb-3 text-sm text-muted">Payments are not connected in this build. This only records the plan.</p>
        <PlanSelect value={shop.plan} />
      </section>
      {shop.is_demo && (
        <section className="card space-y-3 p-6">
          <h2 className="text-lg font-semibold">Demo tools</h2>
          <p className="text-sm text-muted">See what a workshop sees:</p>
          <div className="flex flex-wrap gap-2">
            {workshops.map((w) => <DemoButton key={w.id} as={w.id} label={w.name} className="btn btn-ghost" />)}
          </div>
          <ResetDemo />
        </section>
      )}
    </div>
  );
}

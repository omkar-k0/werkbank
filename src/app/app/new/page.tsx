import { NewOrderForm } from "@/components/NewOrderForm";
import { requireOwner } from "@/lib/auth";
import { llmEnabled } from "@/lib/classifier";

export const metadata = { title: "New order" };

export default async function NewOrder() {
  await requireOwner();
  return (
    <div>
      <h1 className="text-3xl font-semibold">New order</h1>
      <p className="mt-1 mb-6 text-muted">Write the request in your own words, in English or German.</p>
      <NewOrderForm llm={llmEnabled()} />
    </div>
  );
}

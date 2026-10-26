import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Start your trial" };

const PLAN_NAMES: Record<string, string> = { starter: "Starter", pro: "Pro", lifetime: "Lifetime licence" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan = "trial" } = await searchParams;
  return (
    <div className="grain min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-3xl font-semibold">Set up your shop</h1>
        <p className="mt-1 text-muted">
          14 days free{PLAN_NAMES[plan] ? `, then ${PLAN_NAMES[plan]}` : ""}. We create four standard workshops you can rename.
        </p>
        <div className="card mt-6 p-6">
          <AuthForm
            endpoint="/api/auth/signup"
            submit="Create my shop"
            extra={{ plan: PLAN_NAMES[plan] ? plan : "trial" }}
            fields={[
              { name: "shopName", label: "Shop name", placeholder: "e.g. Müller Möbel" },
              { name: "name", label: "Your name", autoComplete: "name" },
              { name: "email", label: "Email", type: "email", autoComplete: "email" },
              { name: "password", label: "Password (8+ characters)", type: "password", autoComplete: "new-password" },
            ]}
          />
        </div>
      </main>
    </div>
  );
}

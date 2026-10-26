import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { DemoButton } from "@/components/DemoButtons";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Sign in" };

export default function Login() {
  return (
    <div className="grain min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-3xl font-semibold">Sign in</h1>
        <p className="mt-1 text-muted">Owners and workshop staff use the same page.</p>
        <div className="card mt-6 p-6">
          <AuthForm
            endpoint="/api/auth/login"
            submit="Sign in"
            fields={[
              { name: "email", label: "Email", type: "email", autoComplete: "email" },
              { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
            ]}
          />
        </div>
        <div className="mt-6 space-y-2 text-sm text-muted">
          <p>Just looking? <DemoButton label="Open the demo shop" className="font-semibold text-walnut underline" /></p>
          <p>New shop? <Link className="font-semibold text-walnut underline" href="/signup">Start a free trial</Link></p>
        </div>
      </main>
    </div>
  );
}

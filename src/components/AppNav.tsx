"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useT } from "./I18n";

export function NavLink({ href, children, badge }: { href: string; children: React.ReactNode; badge?: number }) {
  const path = usePathname();
  const active = href === "/app" ? path === "/app" : path.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${active ? "bg-walnut text-walnut-ink" : "hover:bg-sawdust"}`}
    >
      <span>{children}</span>
      {!!badge && <span className={`ml-2 rounded-full px-1.5 text-xs ${active ? "bg-walnut-ink/20" : "bg-rust-bg text-rust"}`}>{badge}</span>}
    </Link>
  );
}

// Refreshes server data every few seconds while the tab is visible,
// so new orders and status changes appear without reloading.
export function AutoRefresh({ ms = 8000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, ms);
    return () => clearInterval(id);
  }, [ms, router]);
  return null;
}

export function LogoutButton() {
  const t = useT();
  return (
    <button
      className="text-sm text-muted underline"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      {t("nav.signOut")}
    </button>
  );
}

"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useT } from "./I18n";
import { Icon, type IconName } from "./Icon";

export function NavLink({ href, children, badge, icon }: { href: string; children: React.ReactNode; badge?: number; icon?: IconName }) {
  const path = usePathname();
  const active = href === "/app" ? path === "/app" : path.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-sawdust font-medium text-ink" : "text-muted hover:bg-sawdust/60 hover:text-ink"}`}
    >
      <span className="flex items-center gap-2.5">{icon && <Icon name={icon} />}{children}</span>
      {!!badge && <span className="ml-2 rounded-full bg-rust-bg px-1.5 text-xs text-rust">{badge}</span>}
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

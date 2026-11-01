import Link from "next/link";
import { AutoRefresh, LogoutButton, NavLink } from "@/components/AppNav";
import { LangSwitch } from "@/components/I18n";
import { TourButton, TourDialog } from "@/components/Tour";
import { Logo } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { usingEphemeralDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { getShop, listOrders, listWorkshops } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const { t } = await getT();
  const shop = await getShop(s);
  const reviewCount = s.role === "owner" ? (await listOrders(s, { gate: "review", status: "open" })).length : 0;
  const myWorkshop = s.role === "workshop" ? (await listWorkshops(s)).find((w) => w.id === s.workshopId) : null;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <AutoRefresh />
      <TourDialog role={s.role} />
      <aside className="border-b border-line bg-card lg:min-h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Link href="/app"><Logo className="text-walnut" /></Link>
          <div className="text-right lg:mt-4 lg:text-left">
            <div className="text-sm font-semibold">{shop.name}</div>
            <div className="text-xs text-muted">{s.role === "owner" ? t("role.owner") : myWorkshop?.name} · {s.name}</div>
          </div>
        </div>
        {s.role === "owner" && (
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
            <NavLink href="/app" icon="board">{t("nav.board")}</NavLink>
            <NavLink href="/app/new" icon="plus">{t("nav.newOrder")}</NavLink>
            <NavLink href="/app/review" icon="review" badge={reviewCount}>{t("nav.review")}</NavLink>
            <NavLink href="/app/reports" icon="reports">{t("nav.reports")}</NavLink>
            <NavLink href="/app/workshops" icon="workshops">{t("nav.workshops")}</NavLink>
            <NavLink href="/app/settings" icon="settings">{t("nav.settings")}</NavLink>
          </nav>
        )}
        <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 px-4 py-6 lg:flex"><LogoutButton /><LangSwitch /><TourButton /></div>
      </aside>
      <main className="min-w-0">
        {shop.is_demo && (
          <div className="border-b border-line bg-sawdust/60 px-4 py-2 text-xs text-muted">
            {t("demo.banner")}{usingEphemeralDb() ? t("demo.bannerReset") : ""}.
            {s.role === "owner" ? t("demo.bannerHint") : ""}
          </div>
        )}
        <div className="mx-auto max-w-[1120px] px-4 py-8 lg:px-10 lg:py-10">{children}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-6 lg:hidden"><LogoutButton /><LangSwitch /><TourButton /></div>
      </main>
    </div>
  );
}

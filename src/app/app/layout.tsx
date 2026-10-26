import Link from "next/link";
import { AutoRefresh, LogoutButton, NavLink } from "@/components/AppNav";
import { Logo } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { usingEphemeralDb } from "@/lib/db";
import { getShop, listOrders, listWorkshops } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const shop = await getShop(s);
  const reviewCount = s.role === "owner" ? (await listOrders(s, { gate: "review", status: "open" })).length : 0;
  const myWorkshop = s.role === "workshop" ? (await listWorkshops(s)).find((w) => w.id === s.workshopId) : null;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <AutoRefresh />
      <aside className="border-b border-line bg-card lg:min-h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Link href="/app"><Logo className="text-walnut" /></Link>
          <div className="text-right lg:mt-4 lg:text-left">
            <div className="text-sm font-semibold">{shop.name}</div>
            <div className="text-xs text-muted">{s.role === "owner" ? "Owner" : myWorkshop?.name} · {s.name}</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {s.role === "owner" ? (
            <>
              <NavLink href="/app">Board</NavLink>
              <NavLink href="/app/new">New order</NavLink>
              <NavLink href="/app/review" badge={reviewCount}>Review queue</NavLink>
              <NavLink href="/app/reports">Reports</NavLink>
              <NavLink href="/app/workshops">Workshops</NavLink>
              <NavLink href="/app/settings">Settings</NavLink>
            </>
          ) : (
            <NavLink href="/app">My orders</NavLink>
          )}
        </nav>
        <div className="hidden px-4 py-6 lg:block"><LogoutButton /></div>
      </aside>
      <main className="min-w-0">
        {shop.is_demo && (
          <div className="border-b border-line bg-amber-bg px-4 py-2 text-sm text-amber">
            Demo shop with fictional orders. Anything you change is visible to other visitors{usingEphemeralDb() ? " and resets often" : ""}.
            {s.role === "owner" ? " Try “Workshop view” in Settings to see a workshop's screen." : ""}
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</div>
        <div className="px-4 pb-6 lg:hidden"><LogoutButton /></div>
      </main>
    </div>
  );
}

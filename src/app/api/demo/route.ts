import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DEMO } from "@/lib/seed";

// One-click demo login. ?as=<workshop id> signs in as that workshop instead of the owner.
export async function POST(req: Request) {
  await getDb(); // make sure the demo shop is seeded
  const as = new URL(req.url).searchParams.get("as");
  const ws = DEMO.workshops.find((w) => w.id === as);
  const session = ws
    ? { uid: `demo-user-${ws.id}`, shopId: DEMO.shopId, role: "workshop" as const, workshopId: ws.id, name: ws.person }
    : { uid: "demo-owner", shopId: DEMO.shopId, role: "owner" as const, workshopId: null, name: "Demo owner" };
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await signSession(session), cookieOptions);
  return res;
}

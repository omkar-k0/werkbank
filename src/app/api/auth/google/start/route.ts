import { NextResponse } from "next/server";
import { z } from "zod";
import { signFlow } from "@/lib/auth";
import { authorizeUrl, callbackUrl, googleEnabled, newFlow, originOf } from "@/lib/google";

const FLOW_COOKIE = "wb_oauth";

const Signup = z.object({
  shop: z.string().trim().min(2).max(80),
  plan: z.enum(["trial", "starter", "pro", "lifetime"]).default("trial"),
});

// GET /api/auth/google/start?mode=login            owner signs in
// GET /api/auth/google/start?mode=signup&shop=..   new owner: the shop is created after Google confirms who they are
export async function GET(req: Request) {
  const to = (path: string) => NextResponse.redirect(new URL(path, originOf(req)));
  if (!googleEnabled()) return to("/login?error=google_off");
  const q = new URL(req.url).searchParams;
  const mode = q.get("mode") === "signup" ? "signup" : "login";
  let shop = "";
  let plan = "trial";
  if (mode === "signup") {
    const parsed = Signup.safeParse({ shop: q.get("shop") ?? "", plan: q.get("plan") ?? undefined });
    if (!parsed.success) return to("/signup?error=shop");
    ({ shop, plan } = parsed.data);
  }
  const f = newFlow();
  const res = NextResponse.redirect(authorizeUrl({ redirectUri: callbackUrl(req), state: f.state, nonce: f.nonce, challenge: f.challenge }));
  res.cookies.set(FLOW_COOKIE, await signFlow({ state: f.state, nonce: f.nonce, verifier: f.verifier, mode, shop, plan }), {
    httpOnly: true,
    sameSite: "lax", // must survive the redirect back from Google
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}

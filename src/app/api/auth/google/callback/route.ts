import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, readFlow, signSession } from "@/lib/auth";
import { callbackUrl, exchangeCode, originOf, verifyIdToken } from "@/lib/google";
import { BadRequest, loginWithGoogle, signupWithGoogle } from "@/lib/repo";

const FLOW_COOKIE = "wb_oauth";
type Flow = { state: string; nonce: string; verifier: string; mode: "login" | "signup"; shop: string; plan: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const done = (path: string, session?: string) => {
    const res = NextResponse.redirect(new URL(path, originOf(req)));
    res.cookies.set(FLOW_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    if (session) res.cookies.set(COOKIE, session, cookieOptions);
    return res;
  };
  const cookie = req.headers.get("cookie")?.match(new RegExp(`(?:^|; )${FLOW_COOKIE}=([^;]+)`))?.[1];
  const flow = await readFlow<Flow>(cookie);
  if (url.searchParams.get("error")) return done("/login?error=google_cancelled");
  const code = url.searchParams.get("code");
  if (!flow || !code || url.searchParams.get("state") !== flow.state) return done("/login?error=google_failed");

  try {
    const idToken = await exchangeCode(code, callbackUrl(req), flow.verifier);
    const profile = await verifyIdToken(idToken, { clientId: process.env.GOOGLE_CLIENT_ID ?? "", nonce: flow.nonce });
    const session = flow.mode === "signup" ? await signupWithGoogle(profile, flow.shop, flow.plan) : await loginWithGoogle(profile);
    if (!session) return done("/login?error=no_account");
    return done("/app", await signSession(session));
  } catch (e) {
    if (e instanceof BadRequest) return done(`/signup?error=${e.message.includes("email") ? "email" : "shop"}`);
    console.error("Google sign-in failed", e);
    return done("/login?error=google_failed");
  }
}

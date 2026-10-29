import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const COOKIE = "wb_session";

export interface Session {
  uid: string;
  shopId: string;
  role: "owner" | "workshop";
  workshopId: string | null;
  name: string;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_SECRET) {
    // Fail loudly rather than sign sessions with a public key.
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(s || "werkbank-dev-secret-do-not-use-in-production");
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("14d").sign(secret());
}

export async function readToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.aud) return null; // short-lived sign-in tokens (below) are never sessions
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

// Short-lived signed values for the Google sign-in round trip. They carry an audience so they can
// never be mistaken for a session token.
export async function signFlow(payload: Record<string, unknown>, ttl = "10m"): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setAudience("google-flow").setIssuedAt().setExpirationTime(ttl).sign(secret());
}

export async function readFlow<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret(), { audience: "google-flow" })).payload as unknown as T;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return readToken(jar.get(COOKIE)?.value);
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireOwner(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== "owner") redirect("/app");
  return s;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

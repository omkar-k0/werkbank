import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { GoogleProfile } from "./repo";

// "Sign in with Google" as a plain OpenID Connect authorization-code flow with PKCE, no auth library.
// Google proves who the owner is; which shop they own lives in our database.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// The address Google sends the owner back to; it must be listed in the Google Cloud OAuth client.
export function originOf(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}
export const callbackUrl = (req: Request) => `${originOf(req)}/api/auth/google/callback`;

const b64url = (b: Buffer) => b.toString("base64url");
export function newFlow() {
  const verifier = b64url(randomBytes(32));
  return {
    state: b64url(randomBytes(16)),
    nonce: b64url(randomBytes(16)),
    verifier,
    challenge: b64url(createHash("sha256").update(verifier).digest()),
  };
}

export function authorizeUrl(a: { redirectUri: string; state: string; nonce: string; challenge: string }): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: a.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: a.state,
    nonce: a.nonce,
    code_challenge: a.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${q}`;
}

export async function exchangeCode(code: string, redirectUri: string, verifier: string): Promise<string> {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const j = (await r.json().catch(() => ({}))) as { id_token?: string };
  if (!r.ok || !j.id_token) throw new Error("Google did not return an ID token");
  return j.id_token;
}

// Accepts the token only if Google signed it, it is for this app, it answers this sign-in (nonce),
// and Google has verified the email address.
export async function verifyIdToken(
  idToken: string,
  expect: { clientId: string; nonce: string },
  keys: JWTVerifyGetKey = JWKS,
): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: expect.clientId,
  });
  if (payload.nonce !== expect.nonce) throw new Error("Nonce mismatch");
  if (payload.email_verified !== true) throw new Error("Email not verified");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("Incomplete profile");
  return { sub: payload.sub, email: payload.email, name: typeof payload.name === "string" ? payload.name : "" };
}

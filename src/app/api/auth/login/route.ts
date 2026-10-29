import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, signSession } from "@/lib/auth";
import { body, errorResponse } from "@/lib/api";
import { login } from "@/lib/repo";

// Workshop staff only. Owners sign in with Google (/api/auth/google/start).
export async function POST(req: Request) {
  try {
    const { username, password } = await body<{ username: string; password: string }>(req);
    const s = await login(username ?? "", password ?? "");
    if (!s) return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
    const res = NextResponse.json({ ok: true, role: s.role });
    res.cookies.set(COOKIE, await signSession(s), cookieOptions);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}

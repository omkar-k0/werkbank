import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, signSession } from "@/lib/auth";
import { body, errorResponse } from "@/lib/api";
import { login } from "@/lib/repo";

export async function POST(req: Request) {
  try {
    const { email, password } = await body<{ email: string; password: string }>(req);
    const s = await login(email ?? "", password ?? "");
    if (!s) return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
    const res = NextResponse.json({ ok: true, role: s.role });
    res.cookies.set(COOKIE, await signSession(s), cookieOptions);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}

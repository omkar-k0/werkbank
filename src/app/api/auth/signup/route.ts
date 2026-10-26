import { NextResponse } from "next/server";
import { z } from "zod";
import { COOKIE, cookieOptions, signSession } from "@/lib/auth";
import { body, errorResponse } from "@/lib/api";
import { signup } from "@/lib/repo";

const Input = z.object({
  shopName: z.string().trim().min(2).max(80),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  plan: z.enum(["trial", "starter", "pro", "lifetime"]).default("trial"),
});

export async function POST(req: Request) {
  try {
    const parsed = Input.safeParse(await body(req));
    if (!parsed.success) return NextResponse.json({ error: "Please fill in every field. Passwords need 8+ characters." }, { status: 400 });
    const s = await signup(parsed.data);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, await signSession(s), cookieOptions);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}

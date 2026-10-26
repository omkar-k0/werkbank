import "server-only";
import { NextResponse } from "next/server";
import { getSession, type Session } from "./auth";
import { BadRequest, Forbidden, NotFound } from "./repo";

// Wraps a route handler: requires a session, maps domain errors to HTTP.
export function withSession<C>(fn: (s: Session, req: Request, ctx: C) => Promise<Response | unknown>) {
  return async (req: Request, ctx: C) => {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    try {
      const out = await fn(s, req, ctx);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof BadRequest) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof Forbidden) return NextResponse.json({ error: e.message || "Forbidden" }, { status: 403 });
  if (e instanceof NotFound) return NextResponse.json({ error: "Not found" }, { status: 404 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new BadRequest("Invalid JSON");
  }
}

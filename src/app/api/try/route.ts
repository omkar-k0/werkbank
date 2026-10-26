import { NextResponse } from "next/server";
import { buildShopModels, classify } from "@/lib/classifier";

// Public "try it" endpoint for the landing page: seed model only, no LLM, no storage.
const models = buildShopModels([]);
const hits = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.t < 60_000 && h.n > 60) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  hits.set(ip, h && now - h.t < 60_000 ? { n: h.n + 1, t: h.t } : { n: 1, t: now });
  const { text = "" } = (await req.json().catch(() => ({}))) as { text?: string };
  if (text.trim().length < 3) return NextResponse.json({ empty: true });
  return NextResponse.json(classify(text.slice(0, 1000), models));
}

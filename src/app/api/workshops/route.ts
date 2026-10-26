import { body, withSession } from "@/lib/api";
import { createWorkshop, listWorkshops } from "@/lib/repo";
import type { Capability } from "@/lib/classifier";

export const GET = withSession(async (s) => ({ workshops: await listWorkshops(s) }));

export const POST = withSession(async (s, req) => {
  const b = await body<{ name: string; capabilities: Capability[] }>(req);
  return { id: await createWorkshop(s, b.name ?? "", b.capabilities ?? []) };
});

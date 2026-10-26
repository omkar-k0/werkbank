import { body, withSession } from "@/lib/api";
import { updateWorkshop } from "@/lib/repo";
import type { Capability } from "@/lib/classifier";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withSession<Ctx>(async (s, req, { params }) => {
  const { id } = await params;
  const b = await body<{ name: string; capabilities: Capability[] }>(req);
  await updateWorkshop(s, id, b.name ?? "", b.capabilities ?? []);
});

import { body, withSession } from "@/lib/api";
import { getOrder, reassign } from "@/lib/repo";
import type { JobType } from "@/lib/classifier";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withSession<Ctx>(async (s, req, { params }) => {
  const { id } = await params;
  const b = await body<{ workshopId: string; jobType?: JobType }>(req);
  await reassign(s, id, b.workshopId, b.jobType);
  return { order: await getOrder(s, id) };
});

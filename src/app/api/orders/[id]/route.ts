import { body, withSession } from "@/lib/api";
import { getOrder, NotFound, orderEvents, updateProgress, type Status } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withSession<Ctx>(async (s, _req, { params }) => {
  const { id } = await params;
  const order = await getOrder(s, id);
  if (!order) throw new NotFound();
  return { order, events: await orderEvents(s, id) };
});

export const PATCH = withSession<Ctx>(async (s, req, { params }) => {
  const { id } = await params;
  const b = await body<{ status?: Status; expectedDate?: string | null; workshopId?: string }>(req);
  await updateProgress(s, id, b);
  return { order: await getOrder(s, id) };
});

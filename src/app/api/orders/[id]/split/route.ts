import { body, withSession } from "@/lib/api";
import { getOrder, splitOrder, unsplitOrder } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

// Send a second part of the order to another workshop.
export const POST = withSession<Ctx>(async (s, req, { params }) => {
  const { id } = await params;
  const b = await body<{ workshopId: string; note?: string }>(req);
  await splitOrder(s, id, b.workshopId, b.note);
  return { order: await getOrder(s, id) };
});

// Take the second workshop off the order again.
export const DELETE = withSession<Ctx>(async (s, _req, { params }) => {
  const { id } = await params;
  await unsplitOrder(s, id);
  return { order: await getOrder(s, id) };
});

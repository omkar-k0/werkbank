import { body, withSession } from "@/lib/api";
import { createOrder, listOrders, type NewOrder, type OrderFilter } from "@/lib/repo";

export const GET = withSession(async (s, req) => {
  const p = new URL(req.url).searchParams;
  const f: OrderFilter = {
    status: (p.get("status") as OrderFilter["status"]) || "open",
    workshopId: p.get("workshop") || undefined,
    gate: p.get("gate") === "review" ? "review" : undefined,
    q: p.get("q") || undefined,
  };
  return { orders: await listOrders(s, f) };
});

export const POST = withSession(async (s, req) => {
  const b = await body<NewOrder>(req);
  const order = await createOrder(s, {
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    item: b.item,
    description: b.description,
    dueDate: b.dueDate || null,
  });
  return { order };
});

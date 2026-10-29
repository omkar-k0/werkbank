import { body, withSession } from "@/lib/api";
import { createWorkshopUser } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withSession<Ctx>(async (s, req, { params }) => {
  const { id } = await params;
  const b = await body<{ name: string; username: string; password: string }>(req);
  await createWorkshopUser(s, id, b.name ?? "", b.username ?? "", b.password ?? "");
});

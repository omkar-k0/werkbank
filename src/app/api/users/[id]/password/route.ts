import { body, withSession } from "@/lib/api";
import { resetWorkshopUserPassword } from "@/lib/repo";

type Ctx = { params: Promise<{ id: string }> };

// Owner sets a new password for one of their workshop users.
export const PUT = withSession<Ctx>(async (s, req, { params }) => {
  const { id } = await params;
  const b = await body<{ password: string }>(req);
  await resetWorkshopUserPassword(s, id, b.password ?? "");
});

import { withSession } from "@/lib/api";
import { resetDemo } from "@/lib/repo";

export const POST = withSession(async (s) => {
  await resetDemo(s);
});

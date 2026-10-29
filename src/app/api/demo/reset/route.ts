import { withSession } from "@/lib/api";
import { resetDemo } from "@/lib/repo";

export const maxDuration = 60;

export const POST = withSession(async (s) => {
  await resetDemo(s);
});

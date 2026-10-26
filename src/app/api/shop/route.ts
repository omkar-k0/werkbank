import { body, withSession } from "@/lib/api";
import { setPlan, setStrictness, type Strictness } from "@/lib/repo";

export const PATCH = withSession(async (s, req) => {
  const b = await body<{ strictness?: Strictness; plan?: string }>(req);
  if (b.strictness) await setStrictness(s, b.strictness);
  if (b.plan) await setPlan(s, b.plan);
});

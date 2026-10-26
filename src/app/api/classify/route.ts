import { body, withSession } from "@/lib/api";
import { preview } from "@/lib/repo";

// Live preview while the owner types. Never calls the LLM (that only happens on save).
export const POST = withSession(async (s, req) => {
  const { item = "", description = "", dueDate = null } = await body<{ item?: string; description?: string; dueDate?: string | null }>(req);
  if (`${item}${description}`.trim().length < 3) return { empty: true };
  return preview(s, item.slice(0, 200), description.slice(0, 4000), dueDate);
});

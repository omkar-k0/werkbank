import "server-only";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  adjudicate,
  buildShopModels,
  classify,
  CAPABILITIES,
  type Capability,
  type Classification,
  type JobType,
  type ShopModels,
} from "./classifier";
import type { GateThresholds } from "./classifier/router";
import { getDb, type Db } from "./db";
import type { Session } from "./auth";

// All tenant data access lives here. Rule: every query filters on the
// caller's shop_id, and workshop users are additionally pinned to their
// own workshop_id. API routes never write SQL themselves.

export class Forbidden extends Error {}
export class NotFound extends Error {}
export class BadRequest extends Error {}

export type Strictness = "strict" | "balanced" | "relaxed";
export const STRICTNESS: Record<Strictness, GateThresholds> = {
  strict: { auto: 0.92, autoMargin: 0.6, check: 0.6 },
  balanced: { auto: 0.85, autoMargin: 0.5, check: 0.55 },
  relaxed: { auto: 0.7, autoMargin: 0.4, check: 0.5 },
};

export type Status = "not_started" | "in_progress" | "done";
export const STATUSES: Status[] = ["not_started", "in_progress", "done"];

export interface Shop { id: string; name: string; plan: string; strictness: Strictness; is_demo: boolean }
export interface Workshop { id: string; shop_id: string; name: string; capabilities: Capability[] }
export interface OrderPart {
  id: string; order_id: string; workshop_id: string; workshop_name: string; is_primary: boolean;
  capability: Capability | null; note: string | null; status: Status; expected_date: string | null; completed_at: string | null;
}
export interface OrderRow {
  id: string; shop_id: string; number: number; customer_name: string; customer_phone: string | null;
  item: string; description: string; due_date: string | null; expected_date: string | null; status: Status;
  workshop_id: string | null; workshop_name?: string | null; capability: Capability | null; secondary: Capability | null;
  gate: "auto" | "check" | "review"; confidence: number; source: string; reason: string;
  evidence: { token: string; capability: Capability; weight: number }[]; probabilities: Record<Capability, number>;
  llm_quote: string | null; job_type: JobType; urgency: string; effort: string; labels: Record<string, unknown>;
  created_at: string; updated_at: string; completed_at: string | null;
  // empty unless the order is split across two workshops (see splitOrder). For a workshop user on a
  // split order, status / expected_date / completed_at above are that workshop's own part.
  parts: OrderPart[];
}

const db = getDb;
const ymd = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : (d as string | null));
function fixDates<T extends object>(row: T): T {
  const r = row as Record<string, unknown>;
  for (const k of ["due_date", "expected_date"]) if (k in r) r[k] = ymd(r[k]);
  for (const k of ["created_at", "updated_at", "completed_at", "at"])
    if (r[k] instanceof Date) r[k] = (r[k] as Date).toISOString();
  return row;
}

// ---------- shops, users, auth ----------

export async function signup(input: { shopName: string; name: string; email: string; password: string; plan: string }) {
  const d = await db();
  const email = input.email.trim().toLowerCase();
  const exists = await d.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
  if (exists.rows.length) throw new BadRequest("An account with this email already exists.");
  const shopId = randomUUID();
  await d.query(`INSERT INTO shops (id, name, plan) VALUES ($1,$2,$3)`, [shopId, input.shopName.trim(), input.plan]);
  // sensible default workshops; the owner can rename or change them
  const defaults: [string, Capability[]][] = [
    ["Carpentry", ["carpentry"]],
    ["Upholstery", ["upholstery"]],
    ["Polish & Paint", ["finishing"]],
    ["Metalwork", ["metal"]],
  ];
  for (const [n, caps] of defaults)
    await d.query(`INSERT INTO workshops (id, shop_id, name, capabilities) VALUES ($1,$2,$3,$4)`, [randomUUID(), shopId, n, caps]);
  const uid = randomUUID();
  await d.query(
    `INSERT INTO users (id, shop_id, email, name, password_hash, role) VALUES ($1,$2,$3,$4,$5,'owner')`,
    [uid, shopId, email, input.name.trim(), await bcrypt.hash(input.password, 10)],
  );
  return { uid, shopId, role: "owner" as const, workshopId: null, name: input.name.trim() };
}

export async function login(email: string, password: string): Promise<Session | null> {
  const d = await db();
  const r = await d.query<{ id: string; shop_id: string; role: "owner" | "workshop"; workshop_id: string | null; name: string; password_hash: string }>(
    `SELECT id, shop_id, role, workshop_id, name, password_hash FROM users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  const u = r.rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return null;
  return { uid: u.id, shopId: u.shop_id, role: u.role, workshopId: u.workshop_id, name: u.name };
}

export async function getShop(s: Session, dIn?: Db): Promise<Shop> {
  const r = await (dIn ?? (await db())).query<Shop>(`SELECT id, name, plan, strictness, is_demo FROM shops WHERE id = $1`, [s.shopId]);
  if (!r.rows[0]) throw new NotFound();
  return r.rows[0];
}

export async function setStrictness(s: Session, v: Strictness) {
  ownerOnly(s);
  if (!(v in STRICTNESS)) throw new BadRequest("Unknown strictness");
  await (await db()).query(`UPDATE shops SET strictness = $1 WHERE id = $2`, [v, s.shopId]);
}

export async function setPlan(s: Session, plan: string) {
  ownerOnly(s);
  if (!["trial", "starter", "pro", "lifetime"].includes(plan)) throw new BadRequest("Unknown plan");
  await (await db()).query(`UPDATE shops SET plan = $1 WHERE id = $2`, [plan, s.shopId]);
}

function ownerOnly(s: Session) {
  if (s.role !== "owner") throw new Forbidden("Only the shop owner can do this.");
}

// ---------- workshops ----------

export async function listWorkshops(s: Session, dIn?: Db): Promise<Workshop[]> {
  const r = await (dIn ?? (await db())).query<Workshop>(
    `SELECT id, shop_id, name, capabilities FROM workshops WHERE shop_id = $1 ORDER BY created_at, name`,
    [s.shopId],
  );
  return r.rows;
}

export async function createWorkshop(s: Session, name: string, capabilities: Capability[]) {
  ownerOnly(s);
  const caps = capabilities.filter((c) => CAPABILITIES.includes(c));
  if (!name.trim() || !caps.length) throw new BadRequest("A workshop needs a name and at least one capability.");
  const id = randomUUID();
  await (await db()).query(`INSERT INTO workshops (id, shop_id, name, capabilities) VALUES ($1,$2,$3,$4)`, [id, s.shopId, name.trim(), caps]);
  return id;
}

export async function updateWorkshop(s: Session, id: string, name: string, capabilities: Capability[]) {
  ownerOnly(s);
  const caps = capabilities.filter((c) => CAPABILITIES.includes(c));
  if (!name.trim() || !caps.length) throw new BadRequest("A workshop needs a name and at least one capability.");
  const r = await (await db()).query(`UPDATE workshops SET name = $1, capabilities = $2 WHERE id = $3 AND shop_id = $4 RETURNING id`, [name.trim(), caps, id, s.shopId]);
  if (!r.rows.length) throw new NotFound();
}

export async function workshopUsers(s: Session) {
  ownerOnly(s);
  const r = await (await db()).query<{ id: string; email: string; name: string; workshop_id: string }>(
    `SELECT id, email, name, workshop_id FROM users WHERE shop_id = $1 AND role = 'workshop' ORDER BY name`,
    [s.shopId],
  );
  return r.rows;
}

export async function createWorkshopUser(s: Session, workshopId: string, name: string, email: string, password: string) {
  ownerOnly(s);
  const d = await db();
  const w = await d.query(`SELECT 1 FROM workshops WHERE id = $1 AND shop_id = $2`, [workshopId, s.shopId]);
  if (!w.rows.length) throw new NotFound();
  if (password.length < 8) throw new BadRequest("Password must be at least 8 characters.");
  const e = email.trim().toLowerCase();
  if ((await d.query(`SELECT 1 FROM users WHERE email = $1`, [e])).rows.length) throw new BadRequest("Email already in use.");
  await d.query(
    `INSERT INTO users (id, shop_id, email, name, password_hash, role, workshop_id) VALUES ($1,$2,$3,$4,$5,'workshop',$6)`,
    [randomUUID(), s.shopId, e, name.trim(), await bcrypt.hash(password, 10), workshopId],
  );
}

// ---------- classification ----------

// Per-shop model cache, invalidated by the correction count.
const modelCache = new Map<string, { n: number; models: ShopModels }>();

async function shopModels(d: Db, shopId: string, strictness: Strictness): Promise<ShopModels> {
  const r = await d.query<{ text: string; to_capability: Capability; job_type: JobType | null }>(
    `SELECT text, to_capability, job_type FROM corrections WHERE shop_id = $1 ORDER BY id`,
    [shopId],
  );
  const hit = modelCache.get(shopId);
  let models: ShopModels;
  if (hit && hit.n === r.rows.length) models = hit.models;
  else {
    models = buildShopModels(r.rows.map((c) => ({ text: c.text, capability: c.to_capability, jobType: c.job_type })));
    modelCache.set(shopId, { n: r.rows.length, models });
  }
  return { ...models, thresholds: STRICTNESS[strictness] ?? STRICTNESS.balanced };
}

export function orderText(item: string, description: string) {
  return `${item}. ${description}`;
}

export async function preview(s: Session, item: string, description: string, dueDate?: string | null): Promise<Classification & { workshop: Workshop | null }> {
  ownerOnly(s);
  const d = await db();
  const shop = await getShop(s);
  const workshops = await listWorkshops(s);
  const available = [...new Set(workshops.flatMap((w) => w.capabilities))];
  const c = classify(orderText(item, description), await shopModels(d, s.shopId, shop.strictness), {
    available,
    dueDate: dueDate ? new Date(dueDate) : null,
  });
  const workshop = c.routing.capability ? workshops.find((w) => w.capabilities.includes(c.routing.capability!)) ?? null : null;
  return { ...c, workshop };
}

// ---------- orders ----------

export interface NewOrder {
  customerName: string;
  customerPhone?: string;
  item: string;
  description: string;
  dueDate?: string | null;
  createdAt?: Date; // seeding only
  status?: Status; // seeding only
  skipLlm?: boolean; // seeding only
}

// The "routed" line shown in an order's history.
export function describeRouting(routing: Classification["routing"], workshopName?: string): string {
  const conf = routing.confidence >= 0.995 ? "99%+" : `${Math.round(routing.confidence * 100)}%`;
  return routing.gate === "review"
    ? `Sent to review queue (${conf} confidence)`
    : `Routed to ${workshopName} by ${routing.source} (${conf} confidence${routing.gate === "check" ? ", flagged for a check" : ""})`;
}

// dIn is only passed by the demo seeder, which runs while the
// connection is still being set up.
export async function createOrder(s: Session, input: NewOrder, dIn?: Db): Promise<OrderRow> {
  ownerOnly(s);
  if (!input.customerName?.trim() || !input.item?.trim() || !input.description?.trim())
    throw new BadRequest("Customer, item and description are required.");
  if (input.description.length > 4000 || input.item.length > 200) throw new BadRequest("Description is too long.");
  const d = dIn ?? (await db());
  const shop = await getShop(s, d);
  const workshops = await listWorkshops(s, d);
  const available = [...new Set(workshops.flatMap((w) => w.capabilities))];
  const text = orderText(input.item, input.description);
  const now = input.createdAt ?? new Date();
  const c = classify(text, await shopModels(d, s.shopId, shop.strictness), {
    available,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    now,
  });
  // the LLM only ever sees what the cheap layers could not decide
  const routing = input.skipLlm ? c.routing : await adjudicate(text, c.routing, available);
  const ws = routing.capability ? workshops.find((w) => w.capabilities.includes(routing.capability!)) ?? null : null;

  const id = randomUUID();
  const status = input.status ?? "not_started";
  // Order numbers are per shop; retry if two orders race for the same number.
  for (let attempt = 0; ; attempt++) {
    const num = await d.query<{ n: number }>(`SELECT COALESCE(MAX(number), 1000) + 1 AS n FROM orders WHERE shop_id = $1`, [s.shopId]);
    try {
      await d.query(
        `INSERT INTO orders (id, shop_id, number, customer_name, customer_phone, item, description, due_date, status, workshop_id,
          capability, secondary, gate, confidence, source, reason, evidence, probabilities, llm_quote, job_type, urgency, effort, labels,
          created_at, updated_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$24,$25)`,
        [
          id, s.shopId, Number(num.rows[0].n), input.customerName.trim(), input.customerPhone?.trim() || null, input.item.trim(),
          input.description.trim(), input.dueDate || null, status, ws?.id ?? null, routing.capability, routing.secondary,
          routing.gate, routing.confidence, routing.source, routing.reason, JSON.stringify(routing.evidence),
          JSON.stringify(routing.probabilities), routing.llmQuote ?? null, c.labels.jobType, c.labels.urgency, c.labels.effort,
          JSON.stringify(c.labels), now, status === "done" ? now : null,
        ],
      );
      break;
    } catch (e) {
      if (attempt < 3 && /duplicate|unique/i.test(String((e as Error).message))) continue;
      throw e;
    }
  }
  const how = describeRouting(routing, ws?.name);
  await event(d, id, s.shopId, "system", "routed", how, now);
  return (await getOrder(s, id, d))!;
}

export async function resetDemo(s: Session) {
  ownerOnly(s);
  const shop = await getShop(s);
  if (!shop.is_demo) throw new Forbidden("Only the demo shop can be reset.");
  const d = await db();
  await d.query(`DELETE FROM shops WHERE id = $1`, [s.shopId]);
  modelCache.delete(s.shopId);
  const { seedDemo } = await import("./seed");
  await seedDemo(d);
}

async function event(d: Db, orderId: string, shopId: string, actor: string, kind: string, detail: string, at = new Date()) {
  await d.query(`INSERT INTO order_events (order_id, shop_id, actor, kind, detail, at) VALUES ($1,$2,$3,$4,$5,$6)`, [orderId, shopId, actor, kind, detail, at]);
}

export const involves = (o: Pick<OrderRow, "workshop_id" | "parts">, workshopId: string) =>
  o.workshop_id === workshopId || o.parts.some((p) => p.workshop_id === workshopId);

// Loads the parts of the given orders (one query) and, for a workshop user, swaps the order's
// progress fields for that workshop's own part.
async function attachParts(d: Db, s: Session, rows: OrderRow[]): Promise<OrderRow[]> {
  for (const o of rows) o.parts = [];
  const split = rows.filter((o) => (o as { split?: boolean }).split);
  if (split.length) {
    const r = await d.query<OrderPart>(
      `SELECT p.id, p.order_id, p.workshop_id, w.name AS workshop_name, p.is_primary, p.capability, p.note, p.status, p.expected_date, p.completed_at
       FROM order_parts p JOIN workshops w ON w.id = p.workshop_id
       WHERE p.shop_id = $1 AND p.order_id = ANY($2) ORDER BY p.is_primary DESC, p.created_at`,
      [s.shopId, split.map((o) => o.id)],
    );
    const byOrder = new Map<string, OrderPart[]>();
    for (const p of r.rows) {
      fixDates(p);
      byOrder.set(p.order_id, [...(byOrder.get(p.order_id) ?? []), p]);
    }
    for (const o of split) o.parts = byOrder.get(o.id) ?? [];
  }
  for (const o of rows) {
    delete (o as { split?: boolean }).split;
    const mine = s.role === "workshop" ? o.parts.find((p) => p.workshop_id === s.workshopId) : undefined;
    if (mine) Object.assign(o, { status: mine.status, expected_date: mine.expected_date, completed_at: mine.completed_at });
  }
  return rows;
}

// Overall progress of a split order: done only when every part is.
export const overallStatus = (statuses: Status[]): Status =>
  statuses.every((s) => s === "done") ? "done" : statuses.every((s) => s === "not_started") ? "not_started" : "in_progress";

async function syncOverall(d: Db, orderId: string, shopId: string): Promise<Status> {
  const r = await d.query<{ status: Status; expected_date: unknown; completed_at: Date | null }>(
    `SELECT status, expected_date, completed_at FROM order_parts WHERE order_id = $1 AND shop_id = $2`,
    [orderId, shopId],
  );
  const parts = r.rows;
  const status = overallStatus(parts.map((p) => p.status));
  const dates = parts.map((p) => ymd(p.expected_date)).filter(Boolean) as string[];
  const expected = dates.length ? dates.sort().at(-1)! : null;
  const doneAt = status === "done" ? new Date(Math.max(...parts.map((p) => new Date(p.completed_at ?? Date.now()).getTime()))) : null;
  await d.query(`UPDATE orders SET status = $1, expected_date = $2, completed_at = $3, updated_at = now() WHERE id = $4 AND shop_id = $5`, [status, expected, doneAt, orderId, shopId]);
  return status;
}

const ORDER_SELECT = `SELECT o.*, w.name AS workshop_name, EXISTS (SELECT 1 FROM order_parts p WHERE p.order_id = o.id) AS split FROM orders o LEFT JOIN workshops w ON w.id = o.workshop_id`;

export interface OrderFilter {
  status?: Status | "open" | "all";
  workshopId?: string;
  gate?: "review";
  q?: string;
}

export async function listOrders(s: Session, f: OrderFilter = {}): Promise<OrderRow[]> {
  const where = ["o.shop_id = $1"];
  const params: unknown[] = [s.shopId];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replaceAll("?", `$${params.length}`));
  };
  // a workshop is involved through the order's main workshop or through its part of a split order
  const involved = (wsId: string) => add("(o.workshop_id = ? OR EXISTS (SELECT 1 FROM order_parts p WHERE p.order_id = o.id AND p.workshop_id = ?))", wsId);
  if (s.role === "workshop") involved(s.workshopId ?? "__none__");
  else if (f.workshopId) involved(f.workshopId);
  if (f.status === "open") where.push("o.status <> 'done'");
  else if (f.status && f.status !== "all") add("o.status = ?", f.status);
  if (f.gate === "review") where.push("o.workshop_id IS NULL");
  if (f.q) {
    params.push(`%${f.q}%`);
    const p = `$${params.length}`;
    where.push(`(o.customer_name ILIKE ${p} OR o.item ILIKE ${p} OR o.description ILIKE ${p} OR o.number::text = $${params.length + 1})`);
    params.push(f.q.replace(/^#/, ""));
  }
  const r = await (await db()).query<OrderRow>(
    `${ORDER_SELECT} WHERE ${where.join(" AND ")}
     ORDER BY (o.status = 'done'), (o.urgency = 'high') DESC, o.due_date NULLS LAST, o.created_at DESC LIMIT 500`,
    params,
  );
  return attachParts(await db(), s, r.rows.map(fixDates));
}

export async function getOrder(s: Session, id: string, dIn?: Db): Promise<OrderRow | null> {
  const r = await (dIn ?? (await db())).query<OrderRow>(`${ORDER_SELECT} WHERE o.id = $1 AND o.shop_id = $2`, [id, s.shopId]);
  const o = r.rows[0];
  if (!o) return null;
  const [withParts] = await attachParts(dIn ?? (await db()), s, [fixDates(o)]);
  if (s.role === "workshop" && !involves(withParts, s.workshopId ?? "__none__")) return null;
  return withParts;
}

export async function orderEvents(s: Session, id: string) {
  if (!(await getOrder(s, id))) throw new NotFound();
  const r = await (await db()).query<{ actor: string; kind: string; detail: string; at: string }>(
    `SELECT actor, kind, detail, at FROM order_events WHERE order_id = $1 AND shop_id = $2 ORDER BY at, id`,
    [id, s.shopId],
  );
  return r.rows.map(fixDates);
}

// For a split order, `workshopId` names the part (owners must say which; a workshop user's own part is implied).
export async function updateProgress(s: Session, id: string, patch: { status?: Status; expectedDate?: string | null; workshopId?: string }) {
  const o = await getOrder(s, id);
  if (!o) throw new NotFound();
  if (!o.workshop_id) throw new BadRequest("Assign this order to a workshop first.");
  const d = await db();
  if (patch.status && !STATUSES.includes(patch.status)) throw new BadRequest("Unknown status");

  if (o.parts.length) {
    const wsId = s.role === "workshop" ? s.workshopId : patch.workshopId;
    const part = o.parts.find((p) => p.workshop_id === wsId);
    if (!part) throw new BadRequest("This order is split: say which workshop's part to update.");
    const prev = (await d.query<{ status: Status }>(`SELECT status FROM orders WHERE id = $1 AND shop_id = $2`, [id, s.shopId])).rows[0].status;
    if (patch.status && patch.status !== part.status) {
      await d.query(
        `UPDATE order_parts SET status = $1, completed_at = CASE WHEN $1 = 'done' THEN now() ELSE NULL END WHERE id = $2 AND shop_id = $3`,
        [patch.status, part.id, s.shopId],
      );
      await event(d, id, s.shopId, s.name, "status", `${part.workshop_name}: status set to ${patch.status.replace("_", " ")}`);
    }
    if (patch.expectedDate !== undefined && patch.expectedDate !== part.expected_date) {
      await d.query(`UPDATE order_parts SET expected_date = $1 WHERE id = $2 AND shop_id = $3`, [patch.expectedDate || null, part.id, s.shopId]);
      await event(d, id, s.shopId, s.name, "date", `${part.workshop_name}: ${patch.expectedDate ? `expected completion set to ${patch.expectedDate}` : "expected completion cleared"}`);
    }
    // the order is finished when its last part is, so the owner is told once
    if ((await syncOverall(d, id, s.shopId)) === "done" && prev !== "done") await notifyDone(s, o);
    return;
  }

  if (patch.status && patch.status !== o.status) {
    await d.query(
      `UPDATE orders SET status = $1, updated_at = now(), completed_at = CASE WHEN $1 = 'done' THEN now() ELSE NULL END WHERE id = $2 AND shop_id = $3`,
      [patch.status, id, s.shopId],
    );
    await event(d, id, s.shopId, s.name, "status", `Status set to ${patch.status.replace("_", " ")}`);
    if (patch.status === "done") await notifyDone(s, o);
  }
  if (patch.expectedDate !== undefined && patch.expectedDate !== o.expected_date) {
    await d.query(`UPDATE orders SET expected_date = $1, updated_at = now() WHERE id = $2 AND shop_id = $3`, [patch.expectedDate || null, id, s.shopId]);
    await event(d, id, s.shopId, s.name, "date", patch.expectedDate ? `Expected completion set to ${patch.expectedDate}` : "Expected completion cleared");
  }
}

// Owner moves an order to another workshop. This is the feedback loop:
// the move is stored as a labelled example and the shop's model updates.
export async function reassign(s: Session, id: string, workshopId: string, jobType?: JobType) {
  ownerOnly(s);
  const o = await getOrder(s, id);
  if (!o) throw new NotFound();
  const ws = (await listWorkshops(s)).find((w) => w.id === workshopId);
  if (!ws) throw new NotFound();
  if (ws.id === o.workshop_id && !jobType) return;
  if (ws.id !== o.workshop_id && o.parts.some((p) => p.workshop_id === ws.id))
    throw new BadRequest("That workshop already has a part of this order.");
  const d = await db();
  const cap: Capability = o.capability && ws.capabilities.includes(o.capability) ? o.capability : ws.capabilities[0];
  await d.query(
    `UPDATE orders SET workshop_id = $1, capability = $2, source = 'manual', gate = 'auto', job_type = COALESCE($3, job_type), updated_at = now() WHERE id = $4 AND shop_id = $5`,
    [ws.id, cap, jobType ?? null, id, s.shopId],
  );
  if (o.parts.length) await d.query(`UPDATE order_parts SET workshop_id = $1, capability = $2 WHERE order_id = $3 AND shop_id = $4 AND is_primary`, [ws.id, cap, id, s.shopId]);
  const wasWrong = o.capability !== cap || !o.workshop_id;
  if (wasWrong || jobType) {
    await d.query(
      `INSERT INTO corrections (shop_id, order_id, text, from_capability, to_capability, job_type) VALUES ($1,$2,$3,$4,$5,$6)`,
      [s.shopId, id, orderText(o.item, o.description), o.capability, cap, jobType ?? o.job_type],
    );
  }
  await event(d, id, s.shopId, s.name, "assigned", `${o.workshop_id ? "Moved" : "Assigned"} to ${ws.name}${wasWrong ? " (the model learns from this)" : ""}`);
}

// Splits one order across two workshops that work in parallel, each with its own progress.
// This is a planning decision, not a routing mistake, so it is not stored as a correction.
export async function splitOrder(s: Session, id: string, workshopId: string, note?: string) {
  ownerOnly(s);
  const o = await getOrder(s, id);
  if (!o) throw new NotFound();
  if (!o.workshop_id) throw new BadRequest("Assign this order to a workshop before splitting it.");
  if (o.parts.length) throw new BadRequest("This order is already split across two workshops.");
  if (workshopId === o.workshop_id) throw new BadRequest("Pick a different workshop for the second part.");
  const ws = (await listWorkshops(s)).find((w) => w.id === workshopId);
  if (!ws) throw new NotFound();
  const text = note?.trim().slice(0, 300) || null;
  const cap: Capability = o.secondary && ws.capabilities.includes(o.secondary) ? o.secondary : ws.capabilities[0];
  const d = await db();
  await d.query(
    `INSERT INTO order_parts (id, order_id, shop_id, workshop_id, is_primary, capability, status, expected_date, completed_at)
     VALUES ($1,$2,$3,$4,TRUE,$5,$6,$7,$8)`,
    [randomUUID(), id, s.shopId, o.workshop_id, o.capability, o.status, o.expected_date, o.completed_at],
  );
  await d.query(
    `INSERT INTO order_parts (id, order_id, shop_id, workshop_id, is_primary, capability, note) VALUES ($1,$2,$3,$4,FALSE,$5,$6)`,
    [randomUUID(), id, s.shopId, ws.id, cap, text],
  );
  await syncOverall(d, id, s.shopId);
  await event(d, id, s.shopId, s.name, "split", `Split: part sent to ${ws.name}`);
}

// Takes the second workshop off the order again; the order goes back to the main workshop's progress.
export async function unsplitOrder(s: Session, id: string) {
  ownerOnly(s);
  const o = await getOrder(s, id);
  if (!o) throw new NotFound();
  const main = o.parts.find((p) => p.is_primary);
  const other = o.parts.find((p) => !p.is_primary);
  if (!main || !other) throw new BadRequest("This order is not split.");
  const d = await db();
  await d.query(
    `UPDATE orders SET status = $1, expected_date = $2, completed_at = $3, updated_at = now() WHERE id = $4 AND shop_id = $5`,
    [main.status, main.expected_date, main.completed_at, id, s.shopId],
  );
  await d.query(`DELETE FROM order_parts WHERE order_id = $1 AND shop_id = $2`, [id, s.shopId]);
  await event(d, id, s.shopId, s.name, "split", `Split removed: ${other.workshop_name} no longer works on this order`);
}

async function notifyDone(s: Session, o: OrderRow) {
  // Email the owner when RESEND_API_KEY is configured; otherwise the
  // dashboard (which refreshes every few seconds) is the notification.
  const key = process.env.RESEND_API_KEY;
  const d = await db();
  const owner = await d.query<{ email: string }>(`SELECT email FROM users WHERE shop_id = $1 AND role = 'owner' LIMIT 1`, [s.shopId]);
  if (!key || !owner.rows[0]) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Werkbank <onboarding@resend.dev>",
        to: owner.rows[0].email,
        subject: `Order #${o.number} is done`,
        text: `${o.parts.length ? o.parts.map((p) => p.workshop_name).join(" and ") : o.workshop_name} finished order #${o.number} for ${o.customer_name}: ${o.item}.`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    await event(d, o.id, s.shopId, "system", "notified", `Email sent to ${owner.rows[0].email}`);
  } catch {
    /* notification is best-effort */
  }
}

// ---------- reports ----------

export async function report(s: Session) {
  ownerOnly(s);
  const d = await db();
  const id = s.shopId;
  const perWorkshop = await d.query<{ name: string; open: number; overdue: number; done: number; avg_days: number | null }>(
    // one work item per order, or per part for a split order, so each workshop is counted for its own share
    `WITH items AS (
       SELECT o.id, o.workshop_id, o.status, o.expected_date, o.due_date, o.completed_at, o.created_at
       FROM orders o WHERE o.shop_id = $1 AND NOT EXISTS (SELECT 1 FROM order_parts p WHERE p.order_id = o.id)
       UNION ALL
       SELECT o.id, p.workshop_id, p.status, p.expected_date, o.due_date, p.completed_at, o.created_at
       FROM order_parts p JOIN orders o ON o.id = p.order_id WHERE p.shop_id = $1
     )
     SELECT w.name,
       COUNT(o.id) FILTER (WHERE o.status <> 'done')::int AS open,
       COUNT(o.id) FILTER (WHERE o.status <> 'done' AND COALESCE(o.expected_date, o.due_date) < CURRENT_DATE)::int AS overdue,
       COUNT(o.id) FILTER (WHERE o.status = 'done')::int AS done,
       ROUND(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 86400) FILTER (WHERE o.status = 'done')::numeric, 1)::float AS avg_days
     FROM workshops w LEFT JOIN items o ON o.workshop_id = w.id
     WHERE w.shop_id = $1 GROUP BY w.id, w.name, w.created_at ORDER BY w.created_at`,
    [id],
  );
  const monthly = await d.query<{ month: string; n: number }>(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS n
     FROM orders WHERE shop_id = $1 GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
    [id],
  );
  const routing = await d.query<{ gate: string; source: string; n: number }>(
    `SELECT gate, source, COUNT(*)::int AS n FROM orders WHERE shop_id = $1 GROUP BY 1, 2`,
    [id],
  );
  const corr = await d.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM corrections WHERE shop_id = $1`, [id]);
  const total = routing.rows.reduce((a, r) => a + r.n, 0);
  const auto = routing.rows.filter((r) => r.source !== "manual" && r.gate === "auto").reduce((a, r) => a + r.n, 0);
  return {
    perWorkshop: perWorkshop.rows,
    monthly: monthly.rows.reverse(),
    total,
    autoShare: total ? auto / total : 0,
    corrections: corr.rows[0].n,
    correctionRate: total ? corr.rows[0].n / total : 0,
  };
}

export async function exportCsv(s: Session): Promise<string> {
  ownerOnly(s);
  const rows = await listOrders(s, { status: "all" });
  const head = ["number", "created", "customer", "phone", "item", "description", "workshop", "status", "job_type", "urgency", "effort", "due_date", "expected_date", "confidence", "routed_by"];
  const esc = (v: unknown) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = rows.map((o) =>
    [o.number, o.created_at.slice(0, 10), o.customer_name, o.customer_phone, o.item, o.description, o.parts.length ? o.parts.map((p) => p.workshop_name).join(" + ") : (o.workshop_name ?? "REVIEW"), o.status, o.job_type, o.urgency, o.effort, o.due_date, o.expected_date, o.confidence.toFixed(2), o.source]
      .map(esc)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

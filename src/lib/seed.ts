import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import handwritten from "../../data/handwritten.json";
import type { Db } from "./db";
import { describeRouting, orderText, overallStatus, STRICTNESS, type Status } from "./repo";
import { buildShopModels, classify, type Capability, type Correction } from "./classifier";

// A fictional demo shop so the live site can be explored without signing up.
// Nothing here refers to a real business or person.
export const DEMO = {
  shopId: "demo-shop",
  shopName: "Lindenholz Möbel (Demo)",
  ownerEmail: "demo@werkbank.app",
  password: "demo1234", // demo staff logins, e.g. jonas.lindenholz (the demo buttons need no password)
  workshops: [
    { id: "demo-ws-carpentry", name: "Schreinerei (Carpentry)", caps: ["carpentry"], username: "jonas.lindenholz", person: "Jonas" },
    { id: "demo-ws-upholstery", name: "Polsterei (Upholstery)", caps: ["upholstery"], username: "leyla.lindenholz", person: "Leyla" },
    { id: "demo-ws-finishing", name: "Lackiererei (Polish & Paint)", caps: ["finishing"], username: "marek.lindenholz", person: "Marek" },
    { id: "demo-ws-metal", name: "Metallbau (Metalwork)", caps: ["metal"], username: "sven.lindenholz", person: "Sven" },
  ] as { id: string; name: string; caps: Capability[]; username: string; person: string }[],
};

const CUSTOMERS = [
  "Familie Schneider", "Mr. Okafor", "Frau Lehmann", "Priya Nair", "Herr Brandt", "Elif Demir", "Tom Becker",
  "Mrs. D'Souza", "Jana Kowalski", "Herr Vogel", "Familie Arslan", "Sophie Klein", "Rahul Mehta", "Frau Hartmann",
];

const ITEMS = [
  "sofa", "armchair", "recliner", "dining table", "coffee table", "table", "wardrobe", "cupboard", "bed", "bunk bed",
  "bookshelf", "cabinet", "sideboard", "chair", "stool", "bench", "headboard", "ottoman", "chest", "shoe rack",
  "plant stand", "swing", "shelf set", "floating shelf", "cot", "console table", "tv unit", "window seat", "Sofa", "Schrank", "Tisch", "Stuhl", "Kopfteil",
];

// A few demo orders that need two trades. Keyed by order number so the other orders
// (and the random sequence below) are unaffected.
const SPLITS: Record<number, { workshop: string; note: string; status: Status }> = {
  1009: { workshop: "demo-ws-carpentry", note: "Check the joints and glue the loose rail before refinishing", status: "done" },
  1031: { workshop: "demo-ws-finishing", note: "Re-polish the veneer once the edges are glued down", status: "not_started" },
  1035: { workshop: "demo-ws-finishing", note: "Seal and repaint the doors after they dry out", status: "not_started" },
  1049: { workshop: "demo-ws-metal", note: "Rails and brackets for the sliding doors", status: "in_progress" },
};

function itemOf(text: string): string {
  const t = text.toLowerCase();
  const hit = ITEMS.filter((i) => t.includes(i.toLowerCase())).sort((a, b) => b.length - a.length)[0];
  if (!hit) return "Furniture";
  return hit.charAt(0).toUpperCase() + hit.slice(1);
}

let r = 7;
const rnd = () => ((r = (r * 48271) % 2147483647) / 2147483647);

// One multi-row INSERT. Neon charges a network round trip per query, so the
// seed builds everything in memory and writes each table in a single statement.
async function insertRows(d: Db, table: string, cols: string[], rows: unknown[][]) {
  if (!rows.length) return;
  const params: unknown[] = [];
  const values = rows.map((row) => `(${row.map((v) => (params.push(v), `$${params.length}`)).join(",")})`);
  await d.query(`INSERT INTO ${table} (${cols.join(", ")}) VALUES ${values.join(", ")}`, params);
}

export async function seedDemo(d: Db) {
  // ON CONFLICT makes this safe when two server instances cold-start at once.
  const claimed = await d.query(
    `INSERT INTO shops (id, name, plan, is_demo) VALUES ($1,$2,'pro',TRUE) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [DEMO.shopId, DEMO.shopName],
  );
  if (!claimed.rows.length) return;
  const hash = await bcrypt.hash(DEMO.password, 10);
  await insertRows(d, "workshops", ["id", "shop_id", "name", "capabilities"], DEMO.workshops.map((w) => [w.id, DEMO.shopId, w.name, w.caps]));
  // the demo owner has no password and no Google account: it is only reachable through the demo buttons
  await insertRows(d, "users", ["id", "shop_id", "email", "username", "name", "password_hash", "role", "workshop_id"], [
    ["demo-owner", DEMO.shopId, DEMO.ownerEmail, null, "Demo owner", null, "owner", null],
    ...DEMO.workshops.map((w) => [`demo-user-${w.id}`, DEMO.shopId, null, w.username, w.person, hash, "workshop", w.id]),
  ]);

  const now = Date.now();
  const available = [...new Set(DEMO.workshops.flatMap((w) => w.caps))];
  const rows = handwritten as { text: string; capability: Capability; jobType: string }[];
  const orderRows: unknown[][] = [];
  const eventRows: unknown[][] = [];
  const correctionRows: unknown[][] = [];
  const partRows: unknown[][] = [];
  const corrections: Correction[] = [];
  let models = buildShopModels(corrections);
  const event = (orderId: string, actor: string, kind: string, detail: string, at: Date) =>
    eventRows.push([orderId, DEMO.shopId, actor, kind, detail, at]);

  for (let i = 0; i < rows.length; i++) {
    const ageDays = Math.floor((1 - i / rows.length) * 55) + 1; // oldest first
    const createdAt = new Date(now - ageDays * 86_400_000 - Math.floor(rnd() * 8) * 3_600_000);
    const due = new Date(createdAt.getTime() + (5 + Math.floor(rnd() * 20)) * 86_400_000);
    const dueDate = due.toISOString().slice(0, 10);
    const phone = `+49 201 ${String(4000000 + Math.floor(rnd() * 999999))}`;
    const item = itemOf(rows[i].text);
    const description = rows[i].text.trim();
    const text = orderText(item, description);
    // Same classification path as createOrder (no LLM), against the corrections made so far.
    const c = classify(text, { ...models, thresholds: STRICTNESS.balanced }, { available, dueDate: due, now: createdAt });
    const routing = c.routing;
    const routed = routing.capability ? DEMO.workshops.find((w) => w.caps.includes(routing.capability!)) ?? null : null;
    const id = randomUUID();
    event(id, "system", "routed", describeRouting(routing, routed?.name), createdAt);

    const o = {
      workshopId: routed?.id ?? null,
      capability: routing.capability,
      gate: routing.gate as string,
      source: routing.source as string,
      status: "not_started",
      expected: null as string | null,
      completedAt: null as Date | null,
      updatedAt: createdAt,
    };
    const truth = DEMO.workshops.find((w) => w.caps.includes(rows[i].capability))!;
    // Simulate the owner's past work: older review items and wrong routes
    // were fixed by hand, which also became corrections for the model.
    const needsFix = !o.workshopId || o.workshopId !== truth.id;
    if (needsFix && ageDays > 12) {
      correctionRows.push([DEMO.shopId, id, text, o.capability, rows[i].capability, rows[i].jobType, createdAt]);
      corrections.push({ text, capability: rows[i].capability, jobType: rows[i].jobType as Correction["jobType"] });
      models = buildShopModels(corrections);
      event(id, "Demo owner", "assigned", `${o.workshopId ? "Moved" : "Assigned"} to ${truth.name} (the model learns from this)`, new Date(createdAt.getTime() + 3_600_000));
      Object.assign(o, { workshopId: truth.id, capability: rows[i].capability, source: "manual", gate: "auto" });
    }
    if (o.workshopId) {
      // older orders are further along
      const roll = rnd();
      const status = ageDays > 30 ? (roll < 0.85 ? "done" : "in_progress") : ageDays > 10 ? (roll < 0.45 ? "done" : roll < 0.8 ? "in_progress" : "not_started") : roll < 0.3 ? "in_progress" : "not_started";
      if (status !== "not_started") {
        const doneAt = new Date(createdAt.getTime() + (2 + Math.floor(rnd() * 12)) * 86_400_000);
        Object.assign(o, { status, expected: dueDate, completedAt: status === "done" ? doneAt : null, updatedAt: status === "done" ? doneAt : createdAt });
        const person = DEMO.workshops.find((w) => w.id === o.workshopId)!.person;
        event(id, person, "status", status === "done" ? "Status set to done" : "Status set to in progress", status === "done" ? doneAt : new Date(createdAt.getTime() + 86_400_000));
      }
    }
    const split = SPLITS[1001 + i];
    if (split && o.workshopId) {
      const second = DEMO.workshops.find((w) => w.id === split.workshop)!;
      const first = DEMO.workshops.find((w) => w.id === o.workshopId)!;
      const secondDone = split.status === "done" ? new Date(createdAt.getTime() + 9 * 86_400_000) : null;
      partRows.push([randomUUID(), id, DEMO.shopId, first.id, true, o.capability, null, o.status, o.expected, o.completedAt, createdAt]);
      partRows.push([randomUUID(), id, DEMO.shopId, second.id, false, second.caps[0], split.note, split.status, split.status === "not_started" ? null : dueDate, secondDone, createdAt]);
      event(id, "Demo owner", "split", `Split: part sent to ${second.name}`, new Date(createdAt.getTime() + 2 * 3_600_000));
      if (split.status !== "not_started")
        event(id, second.person, "status", `${second.name}: status set to ${split.status.replace("_", " ")}`, secondDone ?? new Date(createdAt.getTime() + 2 * 86_400_000));
      const overall = overallStatus([o.status as Status, split.status]);
      const doneAt = overall === "done" ? new Date(Math.max(o.completedAt?.getTime() ?? 0, secondDone?.getTime() ?? 0)) : null;
      Object.assign(o, { status: overall, expected: dueDate, completedAt: doneAt, updatedAt: doneAt ?? o.updatedAt });
    }
    orderRows.push([
      id, DEMO.shopId, 1001 + i, CUSTOMERS[i % CUSTOMERS.length], phone, item, description, dueDate, o.expected, o.status, o.workshopId,
      o.capability, routing.secondary, o.gate, routing.confidence, o.source, routing.reason, JSON.stringify(routing.evidence),
      JSON.stringify(routing.probabilities), null, c.labels.jobType, c.labels.urgency, c.labels.effort, JSON.stringify(c.labels),
      createdAt, o.updatedAt, o.completedAt,
    ]);
  }
  await insertRows(d, "orders", [
    "id", "shop_id", "number", "customer_name", "customer_phone", "item", "description", "due_date", "expected_date", "status", "workshop_id",
    "capability", "secondary", "gate", "confidence", "source", "reason", "evidence", "probabilities", "llm_quote", "job_type", "urgency", "effort", "labels",
    "created_at", "updated_at", "completed_at",
  ], orderRows);
  await insertRows(d, "order_parts", ["id", "order_id", "shop_id", "workshop_id", "is_primary", "capability", "note", "status", "expected_date", "completed_at", "created_at"], partRows);
  await insertRows(d, "order_events", ["order_id", "shop_id", "actor", "kind", "detail", "at"], eventRows);
  await insertRows(d, "corrections", ["shop_id", "order_id", "text", "from_capability", "to_capability", "job_type", "at"], correctionRows);
}

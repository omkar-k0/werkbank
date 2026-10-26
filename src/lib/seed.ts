import bcrypt from "bcryptjs";
import handwritten from "../../data/handwritten.json";
import type { Db } from "./db";
import type { Session } from "./auth";
import { createOrder } from "./repo";
import type { Capability } from "./classifier";

// A fictional demo shop so the live site can be explored without signing up.
// Nothing here refers to a real business or person.
export const DEMO = {
  shopId: "demo-shop",
  shopName: "Lindenholz Möbel (Demo)",
  ownerEmail: "demo@werkbank.app",
  password: "demo1234",
  workshops: [
    { id: "demo-ws-carpentry", name: "Schreinerei (Carpentry)", caps: ["carpentry"], email: "schreinerei@werkbank.app", person: "Jonas" },
    { id: "demo-ws-upholstery", name: "Polsterei (Upholstery)", caps: ["upholstery"], email: "polsterei@werkbank.app", person: "Leyla" },
    { id: "demo-ws-finishing", name: "Lackiererei (Polish & Paint)", caps: ["finishing"], email: "lack@werkbank.app", person: "Marek" },
    { id: "demo-ws-metal", name: "Metallbau (Metalwork)", caps: ["metal"], email: "metall@werkbank.app", person: "Sven" },
  ] as { id: string; name: string; caps: Capability[]; email: string; person: string }[],
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

function itemOf(text: string): string {
  const t = text.toLowerCase();
  const hit = ITEMS.filter((i) => t.includes(i.toLowerCase())).sort((a, b) => b.length - a.length)[0];
  if (!hit) return "Furniture";
  return hit.charAt(0).toUpperCase() + hit.slice(1);
}

let r = 7;
const rnd = () => ((r = (r * 48271) % 2147483647) / 2147483647);

export async function seedDemo(d: Db) {
  // ON CONFLICT makes this safe when two server instances cold-start at once.
  const claimed = await d.query(
    `INSERT INTO shops (id, name, plan, is_demo) VALUES ($1,$2,'pro',TRUE) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [DEMO.shopId, DEMO.shopName],
  );
  if (!claimed.rows.length) return;
  const hash = await bcrypt.hash(DEMO.password, 10);
  await d.query(
    `INSERT INTO users (id, shop_id, email, name, password_hash, role) VALUES ('demo-owner',$1,$2,'Demo owner',$3,'owner')`,
    [DEMO.shopId, DEMO.ownerEmail, hash],
  );
  for (const w of DEMO.workshops) {
    await d.query(`INSERT INTO workshops (id, shop_id, name, capabilities) VALUES ($1,$2,$3,$4)`, [w.id, DEMO.shopId, w.name, w.caps]);
    await d.query(
      `INSERT INTO users (id, shop_id, email, name, password_hash, role, workshop_id) VALUES ($1,$2,$3,$4,$5,'workshop',$6)`,
      [`demo-user-${w.id}`, DEMO.shopId, w.email, w.person, hash, w.id],
    );
  }

  const owner: Session = { uid: "demo-owner", shopId: DEMO.shopId, role: "owner", workshopId: null, name: "Demo owner" };
  const now = Date.now();
  const rows = handwritten as { text: string; capability: Capability; jobType: string }[];
  for (let i = 0; i < rows.length; i++) {
    const ageDays = Math.floor((1 - i / rows.length) * 55) + 1; // oldest first
    const createdAt = new Date(now - ageDays * 86_400_000 - Math.floor(rnd() * 8) * 3_600_000);
    const due = new Date(createdAt.getTime() + (5 + Math.floor(rnd() * 20)) * 86_400_000);
    const order = await createOrder(
      owner,
      {
        customerName: CUSTOMERS[i % CUSTOMERS.length],
        customerPhone: `+49 201 ${String(4000000 + Math.floor(rnd() * 999999))}`,
        item: itemOf(rows[i].text),
        description: rows[i].text,
        dueDate: due.toISOString().slice(0, 10),
        createdAt,
        skipLlm: true,
      },
      d,
    );
    const truth = DEMO.workshops.find((w) => w.caps.includes(rows[i].capability))!;
    // Simulate the owner's past work: older review items and wrong routes
    // were fixed by hand, which also became corrections for the model.
    const needsFix = !order.workshop_id || order.workshop_id !== truth.id;
    if (needsFix && ageDays > 12) {
      await d.query(`UPDATE orders SET workshop_id = $1, capability = $2, source = 'manual', gate = 'auto' WHERE id = $3`, [truth.id, rows[i].capability, order.id]);
      await d.query(
        `INSERT INTO corrections (shop_id, order_id, text, from_capability, to_capability, job_type, at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [DEMO.shopId, order.id, `${order.item}. ${order.description}`, order.capability, rows[i].capability, rows[i].jobType, createdAt],
      );
      await d.query(`INSERT INTO order_events (order_id, shop_id, actor, kind, detail, at) VALUES ($1,$2,'Demo owner','assigned',$3,$4)`, [
        order.id, DEMO.shopId, `${order.workshop_id ? "Moved" : "Assigned"} to ${truth.name} (the model learns from this)`, new Date(createdAt.getTime() + 3_600_000),
      ]);
      order.workshop_id = truth.id;
    }
    if (!order.workshop_id) continue; // stays in the review queue
    // older orders are further along
    const roll = rnd();
    const status = ageDays > 30 ? (roll < 0.85 ? "done" : "in_progress") : ageDays > 10 ? (roll < 0.45 ? "done" : roll < 0.8 ? "in_progress" : "not_started") : roll < 0.3 ? "in_progress" : "not_started";
    if (status !== "not_started") {
      const doneAt = new Date(createdAt.getTime() + (2 + Math.floor(rnd() * 12)) * 86_400_000);
      await d.query(
        `UPDATE orders SET status = $1, completed_at = $2, expected_date = $3, updated_at = $4 WHERE id = $5`,
        [status, status === "done" ? doneAt : null, due.toISOString().slice(0, 10), status === "done" ? doneAt : createdAt, order.id],
      );
      const ws = DEMO.workshops.find((w) => w.id === order.workshop_id)!;
      await d.query(`INSERT INTO order_events (order_id, shop_id, actor, kind, detail, at) VALUES ($1,$2,$3,'status',$4,$5)`, [
        order.id, DEMO.shopId, ws.person, status === "done" ? "Status set to done" : "Status set to in progress",
        status === "done" ? doneAt : new Date(createdAt.getTime() + 86_400_000),
      ]);
    }
  }
}

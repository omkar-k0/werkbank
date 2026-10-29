import { beforeAll, describe, expect, it } from "vitest";
import type { Session } from "@/lib/auth";
import { localizeEvent } from "@/lib/i18n/dynamic";
import {
  createOrder,
  createWorkshopUser,
  exportCsv,
  Forbidden,
  getOrder,
  listOrders,
  listWorkshops,
  login,
  NotFound,
  orderEvents,
  reassign,
  report,
  signupWithGoogle,
  splitOrder,
  unsplitOrder,
  updateProgress,
} from "@/lib/repo";

// Runs against an in-memory PGlite Postgres (NODE_ENV=test).
let ownerA: Session, ownerB: Session, upholsteryA: Session, metalA: Session;
let orderId: string;

beforeAll(async () => {
  ownerA = await signupWithGoogle({ sub: "g-anna", email: "a@test.dev", name: "Anna" }, "Shop A", "pro");
  ownerB = await signupWithGoogle({ sub: "g-ben", email: "b@test.dev", name: "Ben" }, "Shop B", "starter");
  const ws = await listWorkshops(ownerA);
  const up = ws.find((w) => w.capabilities.includes("upholstery"))!;
  const me = ws.find((w) => w.capabilities.includes("metal"))!;
  await createWorkshopUser(ownerA, up.id, "Uli", "uli.shopa", "password-u");
  await createWorkshopUser(ownerA, me.id, "Mo", "mo.shopa", "password-m");
  upholsteryA = (await login("uli.shopa", "password-u"))!;
  metalA = (await login("mo.shopa", "password-m"))!;
  const o = await createOrder(ownerA, { customerName: "C1", item: "Sofa", description: "fabric torn, cushions sagging, new foam" });
  orderId = o.id;
  await createOrder(ownerA, { customerName: "C2", item: "Garden chair", description: "rusted frame and broken weld" });
});

describe("auth", () => {
  it("rejects a wrong password", async () => {
    expect(await login("uli.shopa", "nope")).toBeNull();
  });
});

describe("tenant isolation", () => {
  it("another shop's owner cannot see or touch the order", async () => {
    expect(await getOrder(ownerB, orderId)).toBeNull();
    expect(await listOrders(ownerB, { status: "all" })).toHaveLength(0);
    await expect(updateProgress(ownerB, orderId, { status: "done" })).rejects.toBeInstanceOf(NotFound);
    const wsB = await listWorkshops(ownerB);
    await expect(reassign(ownerB, orderId, wsB[0].id)).rejects.toBeInstanceOf(NotFound);
  });

  it("a workshop sees only its own orders", async () => {
    const mine = await listOrders(upholsteryA, { status: "all" });
    expect(mine.map((o) => o.customer_name)).toEqual(["C1"]);
    const metal = await listOrders(metalA, { status: "all" });
    expect(metal.map((o) => o.customer_name)).toEqual(["C2"]);
    expect(await getOrder(metalA, orderId)).toBeNull();
  });

  it("a workshop cannot ask for another workshop's orders via the filter", async () => {
    const ws = await listWorkshops(ownerA);
    const metalId = ws.find((w) => w.capabilities.includes("metal"))!.id;
    const r = await listOrders(upholsteryA, { status: "all", workshopId: metalId });
    expect(r.every((o) => o.workshop_id === upholsteryA.workshopId)).toBe(true);
  });

  it("workshops cannot create orders, reassign, or read reports", async () => {
    await expect(createOrder(upholsteryA, { customerName: "x", item: "x", description: "x" })).rejects.toBeInstanceOf(Forbidden);
    await expect(reassign(upholsteryA, orderId, upholsteryA.workshopId!)).rejects.toBeInstanceOf(Forbidden);
    await expect(report(upholsteryA)).rejects.toBeInstanceOf(Forbidden);
    await expect(exportCsv(upholsteryA)).rejects.toBeInstanceOf(Forbidden);
  });
});

describe("workflow", () => {
  it("workshop moves its order to done", async () => {
    await updateProgress(upholsteryA, orderId, { status: "in_progress", expectedDate: "2026-11-02" });
    await updateProgress(upholsteryA, orderId, { status: "done" });
    const o = await getOrder(ownerA, orderId);
    expect(o?.status).toBe("done");
    expect(o?.completed_at).toBeTruthy();
  });

  it("owner reassignment is stored as a correction and the order moves", async () => {
    const ws = await listWorkshops(ownerA);
    const carpentry = ws.find((w) => w.capabilities.includes("carpentry"))!;
    await reassign(ownerA, orderId, carpentry.id);
    expect((await getOrder(ownerA, orderId))?.workshop_name).toBe(carpentry.name);
    expect((await report(ownerA)).corrections).toBe(1);
    expect(await getOrder(upholsteryA, orderId)).toBeNull();
  });

  it("exports CSV with a header and escaped fields", async () => {
    await createOrder(ownerA, { customerName: 'Comma, "Quote"', item: "Table", description: "scratches on top" });
    const csv = await exportCsv(ownerA);
    expect(csv.split("\n")[0]).toMatch(/^number,created,customer/);
    expect(csv).toContain('"Comma, ""Quote"""');
  });
});

describe("orders split across two workshops", () => {
  let carpentryA: Session;
  let ids: { up: string; metal: string; carp: string };
  let id: string;

  beforeAll(async () => {
    const ws = await listWorkshops(ownerA);
    const find = (cap: string) => ws.find((w) => w.capabilities.includes(cap as never))!.id;
    ids = { up: find("upholstery"), metal: find("metal"), carp: find("carpentry") };
    await createWorkshopUser(ownerA, ids.carp, "Cal", "cal.shopa", "password-c");
    carpentryA = (await login("cal.shopa", "password-c"))!;
    const o = await createOrder(ownerA, { customerName: "Split", item: "Armchair", description: "fabric torn, cushions sagging, new foam" });
    expect(o.workshop_id).toBe(ids.up);
    id = o.id;
  });

  it("only the owner can split, and only into a different workshop of the same shop", async () => {
    await expect(splitOrder(upholsteryA, id, ids.metal)).rejects.toBeInstanceOf(Forbidden);
    await expect(splitOrder(ownerA, id, ids.up)).rejects.toThrow(/different workshop/);
    await expect(splitOrder(ownerB, id, ids.metal)).rejects.toBeInstanceOf(NotFound);
    const wsB = await listWorkshops(ownerB);
    await expect(splitOrder(ownerA, id, wsB[0].id)).rejects.toBeInstanceOf(NotFound);
    expect((await getOrder(ownerA, id))!.parts).toHaveLength(0);
  });

  it("an order that is not assigned yet cannot be split", async () => {
    const [review] = (await listOrders(ownerA, { gate: "review", status: "all" })).slice(0, 1);
    const unassigned = review ?? (await createOrder(ownerA, { customerName: "U", item: "x", description: "zzz qqq" }));
    expect(unassigned.workshop_id).toBeNull();
    await expect(splitOrder(ownerA, unassigned.id, ids.metal)).rejects.toThrow(/Assign this order/);
  });

  it("both workshops see the order with their own progress; a third one does not", async () => {
    await splitOrder(ownerA, id, ids.metal, "weld the armrest");
    const o = (await getOrder(ownerA, id))!;
    expect(o.parts.map((p) => p.workshop_id)).toEqual([ids.up, ids.metal]);
    expect(o.parts[1].note).toBe("weld the armrest");
    expect((await getOrder(upholsteryA, id))!.status).toBe("not_started");
    expect((await getOrder(metalA, id))!.status).toBe("not_started");
    expect(await getOrder(carpentryA, id)).toBeNull();
    expect((await listOrders(metalA, { status: "all" })).map((x) => x.id)).toContain(id);
    expect((await listOrders(carpentryA, { status: "all" })).map((x) => x.id)).not.toContain(id);
    expect((await listOrders(ownerA, { status: "all", workshopId: ids.metal })).map((x) => x.id)).toContain(id);
    await expect(splitOrder(ownerA, id, ids.carp)).rejects.toThrow(/already split/);
  });

  it("each workshop moves only its own part; the order is done when both are", async () => {
    await updateProgress(metalA, id, { status: "in_progress", expectedDate: "2030-01-10" });
    expect((await getOrder(ownerA, id))!.status).toBe("in_progress");
    expect((await getOrder(upholsteryA, id))!.status).toBe("not_started"); // untouched
    expect((await getOrder(metalA, id))!.expected_date).toBe("2030-01-10");
    expect((await getOrder(upholsteryA, id))!.expected_date).toBeNull();

    await updateProgress(metalA, id, { status: "done" });
    expect((await getOrder(ownerA, id))!.status).toBe("in_progress"); // upholstery still to do
    expect((await getOrder(ownerA, id))!.completed_at).toBeNull();

    // the owner has to name the part
    await expect(updateProgress(ownerA, id, { status: "done" })).rejects.toThrow(/which workshop/);
    await updateProgress(ownerA, id, { status: "done", workshopId: ids.up });
    const done = (await getOrder(ownerA, id))!;
    expect(done.status).toBe("done");
    expect(done.completed_at).not.toBeNull();

    // reopening one part reopens the order
    await updateProgress(upholsteryA, id, { status: "in_progress" });
    expect((await getOrder(ownerA, id))!.status).toBe("in_progress");
    expect((await getOrder(metalA, id))!.status).toBe("done");
  });

  it("the history names the workshop for each part", async () => {
    const lines = (await orderEvents(ownerA, id)).map((e) => e.detail);
    expect(lines).toContain("Split: part sent to Metalwork");
    expect(lines.some((l) => /^Metalwork: status set to done$/.test(l))).toBe(true);
    expect(lines.some((l) => /^Metalwork: expected completion set to 2030-01-10$/.test(l))).toBe(true);
    // every line the app wrote for this order has a German version
    for (const l of lines) expect(localizeEvent("de", l), l).not.toBe(l);
    expect(localizeEvent("de", "Metalwork: status set to in progress")).toBe("Metalwork: Status gesetzt auf In Arbeit");
  });

  it("reports count each workshop for its own part, and the CSV lists both", async () => {
    const r = await report(ownerA);
    const metal = r.perWorkshop.find((w) => w.name === "Metalwork")!;
    expect(metal.done).toBeGreaterThanOrEqual(1);
    const csv = await exportCsv(ownerA);
    expect(csv).toContain("Upholstery + Metalwork");
  });

  it("moving the main workshop keeps the parts consistent and refuses a clash", async () => {
    await expect(reassign(ownerA, id, ids.metal)).rejects.toThrow(/already has a part/);
    await reassign(ownerA, id, ids.carp);
    const o = (await getOrder(ownerA, id))!;
    expect(o.workshop_id).toBe(ids.carp);
    expect(o.parts.find((p) => p.is_primary)!.workshop_id).toBe(ids.carp);
    expect((await getOrder(carpentryA, id))!.status).toBe("in_progress");
    expect(await getOrder(upholsteryA, id)).toBeNull();
  });

  it("removing the split goes back to the main workshop's progress", async () => {
    await updateProgress(carpentryA, id, { status: "done" });
    await unsplitOrder(ownerA, id);
    const o = (await getOrder(ownerA, id))!;
    expect(o.parts).toHaveLength(0);
    expect(o.status).toBe("done"); // carpentry (main) was done, metal's part is gone
    expect(await getOrder(metalA, id)).toBeNull();
    await expect(unsplitOrder(ownerA, id)).rejects.toThrow(/not split/);
  });
});

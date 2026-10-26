import { beforeAll, describe, expect, it } from "vitest";
import type { Session } from "@/lib/auth";
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
  reassign,
  report,
  signup,
  updateProgress,
} from "@/lib/repo";

// Runs against an in-memory PGlite Postgres (NODE_ENV=test).
let ownerA: Session, ownerB: Session, upholsteryA: Session, metalA: Session;
let orderId: string;

beforeAll(async () => {
  ownerA = await signup({ shopName: "Shop A", name: "Anna", email: "a@test.dev", password: "password-a", plan: "pro" });
  ownerB = await signup({ shopName: "Shop B", name: "Ben", email: "b@test.dev", password: "password-b", plan: "starter" });
  const ws = await listWorkshops(ownerA);
  const up = ws.find((w) => w.capabilities.includes("upholstery"))!;
  const me = ws.find((w) => w.capabilities.includes("metal"))!;
  await createWorkshopUser(ownerA, up.id, "Uli", "uli@test.dev", "password-u");
  await createWorkshopUser(ownerA, me.id, "Mo", "mo@test.dev", "password-m");
  upholsteryA = (await login("uli@test.dev", "password-u"))!;
  metalA = (await login("mo@test.dev", "password-m"))!;
  const o = await createOrder(ownerA, { customerName: "C1", item: "Sofa", description: "fabric torn, cushions sagging, new foam" });
  orderId = o.id;
  await createOrder(ownerA, { customerName: "C2", item: "Garden chair", description: "rusted frame and broken weld" });
});

describe("auth", () => {
  it("rejects a wrong password", async () => {
    expect(await login("a@test.dev", "nope")).toBeNull();
  });
  it("rejects duplicate emails", async () => {
    await expect(signup({ shopName: "X", name: "X", email: "A@test.dev", password: "password-x", plan: "trial" })).rejects.toThrow();
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

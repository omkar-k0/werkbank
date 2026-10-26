import { describe, expect, it } from "vitest";
import { buildShopModels, classify } from "@/lib/classifier";
import { quoteIsVerbatim } from "@/lib/classifier/llm";
import { emptyModel, predict, train } from "@/lib/classifier/nb";
import { features, normalise } from "@/lib/classifier/text";
import { urgency } from "@/lib/classifier/secondary";

const models = buildShopModels([]);

describe("text", () => {
  it("folds umlauts and stems plurals", () => {
    expect(normalise("Kratzer auf der Platte, ÄÖÜß!")).toBe("kratzer auf der platte aeoeuess");
    expect(features("scratches scratched")).toContain("scratch");
  });
});

describe("routing", () => {
  it.each([
    ["Sofa fabric torn and the cushions are sagging", "upholstery"],
    ["Dining table has white water rings, needs repolishing", "finishing"],
    ["Garden chair frame rusted and the weld broke", "metal"],
    ["Chair leg broken, the joint is loose", "carpentry"],
    ["Stoff am Sofa gerissen, neuer Bezug", "upholstery"],
  ])("routes %s → %s with high confidence", (text, cap) => {
    const c = classify(text, models);
    expect(c.routing.capability).toBe(cap);
    expect(c.routing.gate).toBe("auto");
    expect(c.routing.evidence.length).toBeGreaterThan(0);
  });

  it("refuses to guess on text it does not recognise", () => {
    const c = classify("please call back about it", models);
    expect(c.routing.gate).toBe("review");
    expect(c.routing.capability).toBeNull();
  });

  it("sends to review when the shop has no workshop for the capability", () => {
    const c = classify("rusted iron frame, broken weld", models, { available: ["carpentry", "upholstery"] });
    expect(c.routing.gate).toBe("review");
    expect(c.routing.reason).toMatch(/no workshop/);
  });

  it("probabilities sum to 1", () => {
    const p = classify("sofa needs fixing", models).routing.probabilities;
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe("learning from corrections", () => {
  it("a shop's own vocabulary takes over after a few corrections", () => {
    const text = "Gliederstuhl quietscht am Scharnier"; // words the seed model has never seen
    const before = classify(text, models).routing;
    expect(before.gate).toBe("review");
    const corr = Array.from({ length: 3 }, () => ({ text, capability: "metal" as const, jobType: "repair" as const }));
    const after = classify(text, buildShopModels(corr)).routing;
    expect(after.capability).toBe("metal");
  });

  it("corrections for one shop do not leak into another", () => {
    const a = buildShopModels([{ text: "zzfoo zzbar", capability: "metal" }]);
    expect(predict(a.capability, "zzfoo zzbar").probabilities.metal).toBeGreaterThan(0.5);
    expect(predict(models.capability, "zzfoo zzbar").probabilities.metal).toBeCloseTo(
      models.capability.docCount.metal / Object.values(models.capability.docCount).reduce((x, y) => x + y, 0),
      1,
    );
  });
});

describe("naive Bayes", () => {
  it("ignores features no class has seen (no small-class bias)", () => {
    const m = emptyModel(["big", "small"] as const);
    for (let i = 0; i < 50; i++) train(m, "alpha beta gamma delta", "big");
    train(m, "omega", "small");
    const p = predict(m, "completely unseen words here").probabilities;
    expect(p.big).toBeGreaterThan(p.small);
  });
});

describe("secondary labels", () => {
  it("flags urgency from words and from a close due date", () => {
    expect(urgency("needed before the wedding").urgency).toBe("high");
    const now = new Date("2026-10-26");
    expect(urgency("normal repair", new Date("2026-10-27"), now).urgency).toBe("high");
    expect(urgency("no rush on this one").urgency).toBe("low");
    expect(urgency("not urgent, whenever you can").urgency).toBe("low");
  });
});

describe("LLM citation check", () => {
  it("only accepts quotes that are really in the request", () => {
    const req = "The sofa springs poke through the seat";
    expect(quoteIsVerbatim("springs poke through", req)).toBe(true);
    expect(quoteIsVerbatim("the frame is cracked", req)).toBe(false);
  });
});

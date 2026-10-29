import { describe, expect, it } from "vitest";
import { classify, buildShopModels, CAPABILITIES } from "@/lib/classifier";
import { de, en } from "@/lib/i18n/messages";
import { localizeEvent, localizeReason } from "@/lib/i18n/dynamic";
import { makeT, pickLocale, splitAt, translate } from "@/lib/i18n";
import { describeRouting, STRICTNESS } from "@/lib/repo";

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  it("German has the same keys and placeholders as English", () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
    for (const k of Object.keys(en) as (keyof typeof en)[]) expect(params(de[k]), k).toEqual(params(en[k]));
  });

  it("no German text is left empty", () => {
    for (const [k, v] of Object.entries(de)) expect(v.length, k).toBeGreaterThan(0);
  });

  it("interpolates and falls back to leaving unknown placeholders", () => {
    expect(translate("de", "try.sure", { pct: "85%" })).toBe("85% sicher");
    expect(translate("en", "try.sure")).toBe("{pct} sure");
  });

  it("splitAt puts a node between the two halves of a message", () => {
    expect(splitAt(makeT("en"), "order.alsoInvolves", "cap")).toEqual(["Also involves ", "."]);
  });
});

describe("locale choice", () => {
  it("the cookie wins, then the browser language, then English", () => {
    expect(pickLocale("en", "de-DE,de;q=0.9")).toBe("en");
    expect(pickLocale("de", "en-US")).toBe("de");
    expect(pickLocale(undefined, "de-AT,de;q=0.9,en;q=0.8")).toBe("de");
    expect(pickLocale(undefined, "fr-FR")).toBe("en");
    expect(pickLocale("xx", null)).toBe("en");
  });
});

describe("stored text is translated", () => {
  const models = { ...buildShopModels([]), thresholds: STRICTNESS.balanced };
  const available = [...CAPABILITIES];
  const samples = [
    "Sofa cushions are completely flat, customer wants firmer foam",
    "Balcony chair, the iron frame is rusty and one weld broke",
    "Chair broken",
    "xyzzy plugh",
    "Table top scratched and the legs are wobbly, needs new varnish",
    "Wardrobe door hanging off, hinge loose, urgent",
  ];

  it("translates every reason the router produces (no English left over)", () => {
    const seen = new Set<string>();
    for (const text of samples) {
      const { reason } = classify(text, models, { available }).routing;
      seen.add(reason);
      const out = localizeReason("de", reason);
      expect(out, reason).not.toBe(reason);
      expect(out).not.toMatch(/\b(Clear match|Probably|Too close|Keywords point|Looks like|almost no words)\b/);
    }
    expect(seen.size).toBeGreaterThan(2); // the samples exercise several templates
  });

  it("limited-workshop reasons name the German capability", () => {
    const { reason } = classify("Sofa cushions are completely flat, new foam", models, { available: ["metal"] }).routing;
    expect(reason).toMatch(/no workshop set up/);
    expect(localizeReason("de", reason)).toBe("Sieht nach Polsterei / Stoff & Schaum aus, aber dieser Betrieb hat dafür keine Werkstatt eingerichtet.");
  });

  it("translates the LLM suffixes", () => {
    expect(localizeReason("de", "Clear match for Metalwork / frames & welding. The LLM also found it unclear.")).toBe(
      "Klarer Treffer für Metallbau / Rahmen & Schweißen. Auch das LLM fand es unklar.",
    );
    expect(localizeReason("de", "Routed by the LLM, citing: \"rusty frame\".")).toBe("Vom LLM zugewiesen, mit dem Zitat: \"rusty frame\".");
    expect(localizeReason("de", "x (LLM check failed: HTTP 503)")).toBe("x (LLM-Prüfung fehlgeschlagen: HTTP 503)");
  });

  it("leaves English untouched and unknown text as stored", () => {
    const r = "Clear match for Metalwork / frames & welding.";
    expect(localizeReason("en", r)).toBe(r);
    expect(localizeReason("de", "Something from the future")).toBe("Something from the future");
  });

  it("translates the history lines the app writes", () => {
    const auto = classify("Balcony chair, the iron frame is rusty and one weld broke", models, { available }).routing;
    const lines = [
      describeRouting(auto, "Metallbau (Metalwork)"),
      describeRouting({ ...auto, gate: "review", confidence: 0.4 }, undefined),
      describeRouting({ ...auto, gate: "check", confidence: 0.7 }, "Polsterei"),
      "Status set to in progress",
      "Status set to not started",
      "Status set to done",
      "Expected completion set to 2026-11-03",
      "Expected completion cleared",
      "Moved to Lackiererei (Polish & Paint) (the model learns from this)",
      "Assigned to Schreinerei (Carpentry)",
      "Email sent to demo@werkbank.app",
      "Split: part sent to Polsterei (Upholstery)",
      "Split removed: Metallbau (Metalwork) no longer works on this order",
      "Polsterei (Upholstery): status set to in progress",
      "Polsterei (Upholstery): expected completion set to 2026-11-03",
      "Polsterei (Upholstery): expected completion cleared",
    ];
    for (const l of lines) {
      const out = localizeEvent("de", l);
      expect(out, l).not.toBe(l);
      expect(localizeEvent("en", l)).toBe(l);
    }
    expect(localizeEvent("de", "Moved to Lackiererei (Polish & Paint) (the model learns from this)")).toBe(
      "Verschoben nach Lackiererei (Polish & Paint) (das Modell lernt daraus)",
    );
    expect(localizeEvent("de", "Status set to in progress")).toBe("Status gesetzt auf In Arbeit");
    expect(localizeEvent("de", describeRouting({ ...auto, gate: "check", confidence: 0.7 }, "Polsterei"))).toBe(
      "An Polsterei zugewiesen per rules+model (70% Sicherheit, zur Kontrolle markiert)",
    );
    expect(localizeEvent("de", "Split: part sent to Polsterei (Upholstery)")).toBe("Aufgeteilt: Teil an Polsterei (Upholstery) geschickt");
    expect(localizeEvent("de", "Polsterei (Upholstery): status set to done")).toBe("Polsterei (Upholstery): Status gesetzt auf Erledigt");
    expect(localizeEvent("de", "Something else")).toBe("Something else");
  });
});

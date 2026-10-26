import { matchCues } from "./lexicon";
import { predict, type NBModel } from "./nb";
import { normalise } from "./text";
import {
  CAPABILITIES,
  CAPABILITY_LABELS,
  type Capability,
  type Evidence,
  type Gate,
  type RoutingDecision,
} from "./types";

export interface GateThresholds {
  auto: number; // min confidence to route with no human
  autoMargin: number; // and min gap to the runner-up
  check: number; // min confidence to route but flag for a look
}

// Defaults are overwritten by the calibrated values in seed-model.json.
export const DEFAULT_THRESHOLDS: GateThresholds = { auto: 0.85, autoMargin: 0.5, check: 0.55 };

const RULE_WEIGHT = 0.35; // share of the final score that comes from the lexicon when it fires

export interface RouteOptions {
  model: NBModel<Capability>;
  thresholds?: GateThresholds;
  // capabilities this shop actually has a workshop for
  available?: Capability[];
}

function ruleDistribution(scores: Record<Capability, number>): Record<Capability, number> | null {
  const total = CAPABILITIES.reduce((s, c) => s + scores[c], 0);
  if (total === 0) return null;
  return Object.fromEntries(CAPABILITIES.map((c) => [c, scores[c] / total])) as Record<Capability, number>;
}

function ranked(p: Record<Capability, number>): [Capability, number][] {
  return (Object.entries(p) as [Capability, number][]).sort((a, b) => b[1] - a[1]);
}

export function route(text: string, opts: RouteOptions): RoutingDecision {
  const t = opts.thresholds ?? DEFAULT_THRESHOLDS;
  const norm = normalise(text);

  // 1. deterministic layer
  const hits = matchCues(norm);
  const scores = Object.fromEntries(CAPABILITIES.map((c) => [c, 0])) as Record<Capability, number>;
  for (const h of hits) scores[h.capability] += h.weight;
  const rules = ruleDistribution(scores);

  // 2. statistical layer
  const nb = predict(opts.model, text);

  // 3. blend
  const probabilities = rules
    ? (Object.fromEntries(
        CAPABILITIES.map((c) => [c, (1 - RULE_WEIGHT) * nb.probabilities[c] + RULE_WEIGHT * rules[c]]),
      ) as Record<Capability, number>)
    : nb.probabilities;

  const order = ranked(probabilities);
  const [top, pTop] = order[0];
  const [second, pSecond] = order[1];
  const margin = pTop - pSecond;

  const evidence: Evidence[] = hits
    .map((h) => ({ token: h.cue, capability: h.capability, weight: h.weight }))
    .sort((a, b) => b.weight - a.weight);

  // Does the lexicon contradict the model? Both strong but pointing elsewhere.
  const ruleTop = rules ? ranked(rules)[0] : null;
  const nbTop = ranked(nb.probabilities)[0];
  const disagreement = !!ruleTop && ruleTop[1] >= 0.6 && nbTop[1] >= 0.6 && ruleTop[0] !== nbTop[0];

  // Almost nothing in the text the system recognises: refuse to guess.
  const unfamiliar = hits.length === 0 && nb.known < 2;

  let gate: Gate;
  let reason: string;
  if (unfamiliar) {
    gate = "review";
    reason = "The request has almost no words the system recognises. A person should route it.";
  } else if (disagreement) {
    gate = "review";
    reason = `Keywords point to ${CAPABILITY_LABELS[ruleTop![0]]}, the learned model points to ${CAPABILITY_LABELS[nbTop[0]]}.`;
  } else if (pTop >= t.auto && margin >= t.autoMargin) {
    gate = "auto";
    reason = `Clear match for ${CAPABILITY_LABELS[top]}.`;
  } else if (pTop >= t.check) {
    gate = "check";
    reason = `Probably ${CAPABILITY_LABELS[top]}, but ${CAPABILITY_LABELS[second]} is also plausible.`;
  } else {
    gate = "review";
    reason = `Too close to call between ${CAPABILITY_LABELS[top]} and ${CAPABILITY_LABELS[second]}.`;
  }

  if (gate !== "review" && opts.available && !opts.available.includes(top)) {
    gate = "review";
    reason = `Looks like ${CAPABILITY_LABELS[top]}, but this shop has no workshop set up for it.`;
  }

  // A second workshop is suggested when the runner-up is substantial
  // AND the text has its own keyword evidence for it.
  const secondHasEvidence = hits.some((h) => h.capability === second && h.weight >= 2);
  const secondaryCap = pSecond >= 0.2 && secondHasEvidence ? second : null;

  return {
    capability: gate === "review" ? null : top,
    secondary: secondaryCap,
    confidence: pTop,
    margin,
    gate,
    source: rules ? "rules+model" : "model",
    probabilities,
    evidence,
    reason,
  };
}

// best guess even when the gate says review; used by the LLM step and the UI
export function topGuess(d: RoutingDecision): Capability {
  return ranked(d.probabilities)[0][0];
}

import seed from "./seed-model.json";
import { cloneModel, train, type NBModel } from "./nb";
import { DEFAULT_THRESHOLDS, route, type GateThresholds } from "./router";
import { secondaryLabels } from "./secondary";
import type { Capability, Classification, JobType } from "./types";

export * from "./types";
export { route } from "./router";
export { adjudicate, llmEnabled } from "./llm";

interface SeedFile {
  capability: NBModel<Capability>;
  jobType: NBModel<JobType>;
  thresholds: GateThresholds;
  meta: Record<string, unknown>;
}

const SEED = seed as unknown as SeedFile;

// A correction from the shop owner counts this many times more than one
// synthetic seed example: the shop's own vocabulary should win quickly.
export const CORRECTION_WEIGHT = 4;

export interface Correction {
  text: string;
  capability: Capability;
  jobType?: JobType | null;
}

export interface ShopModels {
  capability: NBModel<Capability>;
  jobType: NBModel<JobType>;
  thresholds: GateThresholds;
  corrections: number;
}

// Global seed model + this shop's corrections = this shop's model.
export function buildShopModels(corrections: Correction[]): ShopModels {
  const capability = cloneModel(SEED.capability);
  const jobType = cloneModel(SEED.jobType);
  for (const c of corrections) {
    train(capability, c.text, c.capability, CORRECTION_WEIGHT);
    if (c.jobType) train(jobType, c.text, c.jobType, CORRECTION_WEIGHT);
  }
  return { capability, jobType, thresholds: SEED.thresholds ?? DEFAULT_THRESHOLDS, corrections: corrections.length };
}

export function classify(
  text: string,
  models: ShopModels,
  opts: { available?: Capability[]; dueDate?: Date | null; now?: Date } = {},
): Classification {
  const routing = route(text, { model: models.capability, thresholds: models.thresholds, available: opts.available });
  const labels = secondaryLabels(text, models.jobType, opts.dueDate, opts.now);
  return { routing, labels };
}

export const seedMeta = SEED.meta;

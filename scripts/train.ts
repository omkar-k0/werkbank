/*
 * Trains the seed models and calibrates them.
 *  1. split train.json into fit (seen phrasings) and validation (held-out phrasings)
 *  2. fit naive Bayes on the fit split
 *  3. pick the temperature that minimises log-loss on validation
 *  4. gate thresholds stay at the a-priori defaults (see note below)
 *  5. refit on all of train.json, keep the calibrated values
 *
 *   npx tsx scripts/train.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { emptyModel, train, predict, type NBModel } from "../src/lib/classifier/nb";
import { DEFAULT_THRESHOLDS, type GateThresholds } from "../src/lib/classifier/router";
import { CAPABILITIES, JOB_TYPES, type LabeledExample } from "../src/lib/classifier/types";

type Row = LabeledExample & { holdout?: boolean };
const data: Row[] = JSON.parse(readFileSync("data/train.json", "utf8"));
// fit on known phrasings, calibrate on held-out phrasings
const fit = data.filter((r) => !r.holdout);
const val = data.filter((r) => r.holdout);

function fitModels(rows: LabeledExample[]) {
  const cap = emptyModel(CAPABILITIES);
  const job = emptyModel(JOB_TYPES);
  for (const r of rows) {
    train(cap, r.text, r.capability);
    train(job, r.text, r.jobType);
  }
  return { cap, job };
}

function logLoss<L extends string>(m: NBModel<L>, rows: { text: string; y: L }[]): number {
  let s = 0;
  for (const r of rows) s -= Math.log(Math.max(predict(m, r.text).probabilities[r.y], 1e-9));
  return s / rows.length;
}

function fitTemperature<L extends string>(m: NBModel<L>, rows: { text: string; y: L }[]): number {
  let best = 1, bestLoss = Infinity;
  for (let T = 1; T <= 40; T += 0.5) {
    m.temperature = T;
    const l = logLoss(m, rows);
    if (l < bestLoss) [best, bestLoss] = [T, l];
  }
  m.temperature = best;
  return best;
}

const { cap, job } = fitModels(fit);
const tCap = fitTemperature(cap, val.map((r) => ({ text: r.text, y: r.capability })));
const tJob = fitTemperature(job, val.map((r) => ({ text: r.text, y: r.jobType })));

// Gate thresholds are NOT searched here. The held-out phrasings are still
// too close to training data and the search collapses to the minimum.
// Defaults were fixed a priori (router.ts) and each shop can make the gate
// stricter or looser; eval.ts reports the full coverage/accuracy trade-off.
const thresholds: GateThresholds = DEFAULT_THRESHOLDS;

// refit on everything, keep calibration
const full = fitModels(data);
full.cap.temperature = tCap;
full.job.temperature = tJob;

writeFileSync(
  "src/lib/classifier/seed-model.json",
  JSON.stringify({
    capability: full.cap,
    jobType: full.job,
    thresholds,
    meta: { trainedOn: data.length, temperatureCapability: tCap, temperatureJobType: tJob, trainedAt: new Date().toISOString().slice(0, 10) },
  }),
);
console.log({ tCap, tJob, thresholds, vocab: full.cap.vocab, validation: val.length });

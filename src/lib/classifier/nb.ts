import { features } from "./text";

// Multinomial naive Bayes with Laplace smoothing, stored as raw counts
// so it can be updated incrementally (one correction = add counts).
// That is the whole reason for NB here: per-shop learning without a
// training job, and the model stays small enough to serialise as JSON.

export interface NBModel<L extends string> {
  labels: L[];
  docCount: Record<L, number>;
  tokenTotal: Record<L, number>;
  counts: Record<L, Record<string, number>>;
  vocab: number;
  // Naive Bayes is famously over-confident. Log-probabilities are
  // divided by this temperature before the softmax; it is fitted on a
  // validation split (see scripts/train.ts) so 0.9 means ~90% correct.
  temperature: number;
}

export function emptyModel<L extends string>(labels: readonly L[]): NBModel<L> {
  const z = <T>(f: () => T) => Object.fromEntries(labels.map((l) => [l, f()])) as Record<L, T>;
  return { labels: [...labels], docCount: z(() => 0), tokenTotal: z(() => 0), counts: z(() => ({})), vocab: 0, temperature: 1 };
}

export function train<L extends string>(model: NBModel<L>, text: string, label: L, weight = 1): void {
  model.docCount[label] += weight;
  for (const f of features(text)) {
    if (!model.labels.some((l) => f in model.counts[l])) model.vocab += 1;
    const bucket = model.counts[label] as Record<string, number>;
    bucket[f] = (bucket[f] ?? 0) + weight;
    model.tokenTotal[label] += weight;
  }
}

export function cloneModel<L extends string>(m: NBModel<L>): NBModel<L> {
  return JSON.parse(JSON.stringify(m));
}

export interface NBResult<L extends string> {
  probabilities: Record<L, number>;
  known: number; // how many features of the input the model has seen at all
  total: number;
}

export function predict<L extends string>(model: NBModel<L>, text: string): NBResult<L> {
  // Features no class has ever seen carry no evidence. Scoring them
  // anyway quietly favours the class with the fewest training tokens
  // (its smoothing denominator is smallest), so they are dropped.
  const feats = features(text).filter((f) => model.labels.some((l) => (model.counts[l][f] ?? 0) > 0));
  const docs = model.labels.reduce((s, l) => s + model.docCount[l], 0);
  const V = Math.max(model.vocab, 1);
  const logp: Record<string, number> = {};
  let known = 0;
  const seen = new Set<string>();
  for (const l of model.labels) {
    let lp = Math.log((model.docCount[l] + 1) / (docs + model.labels.length));
    for (const f of feats) {
      const c = model.counts[l][f] ?? 0;
      lp += Math.log((c + 1) / (model.tokenTotal[l] + V));
      if (c > 0) seen.add(f);
    }
    logp[l] = lp;
  }
  known = seen.size;
  // softmax in log space
  const max = Math.max(...Object.values(logp));
  const T = model.temperature || 1;
  const exp = Object.fromEntries(model.labels.map((l) => [l, Math.exp((logp[l] - max) / T)]));
  const z = Object.values(exp).reduce((a, b) => a + b, 0);
  const probabilities = Object.fromEntries(model.labels.map((l) => [l, exp[l] / z])) as Record<L, number>;
  return { probabilities, known, total: features(text).length };
}

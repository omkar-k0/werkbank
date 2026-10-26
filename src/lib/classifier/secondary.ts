import { predict, type NBModel } from "./nb";
import { normalise } from "./text";
import type { Effort, JobType, SecondaryLabels, Urgency } from "./types";

// Second-level classification once the workshop is known.
// Job type comes from a learned model; urgency and effort are rules,
// because they hinge on a few explicit words and the due date, and a
// rule here is easier to explain to a shop owner than a probability.

const URGENT_CUES = [
  "urgent", "urgently", "asap", "immediately", "today", "tomorrow", "this week", "rush", "emergency",
  "wedding", "function", "guests", "party", "diwali", "christmas", "moving", "eilig", "dringend", "sofort", "morgen",
];
const LOW_CUES = ["no rush", "no hurry", "whenever", "not urgent", "any time", "anytime", "next month", "keine eile"];

const LARGE_ITEMS = [
  "wardrobe", "sofa set", "dining set", "dining table", "bed", "king bed", "queen bed", "bunk bed", "kitchen",
  "3 seater", "three seater", "l shaped", "sectional", "cupboard", "almirah", "bookcase", "schrank", "kleiderschrank",
];
const SMALL_ITEMS = ["stool", "chair", "side table", "footstool", "ottoman", "nightstand", "lamp", "frame", "hocker", "stuhl"];
const LARGE_WORK = ["custom", "build", "make a", "new", "full", "complete", "entire", "whole", "all", "set of", "set"];

function has(norm: string, cue: string): boolean {
  return ` ${norm} `.includes(` ${cue} `);
}

export function urgency(text: string, dueDate?: Date | null, now = new Date()): { urgency: Urgency; cues: string[] } {
  const raw = normalise(text);
  // Negated phrases first: "no rush" and "not urgent" contain urgent words.
  const low = LOW_CUES.filter((c) => has(raw, c));
  const norm = low.reduce((t, c) => ` ${t} `.split(` ${c} `).join(" ").trim(), raw);
  const cues: string[] = [];
  for (const c of URGENT_CUES) if (has(norm, c)) cues.push(c);
  if (dueDate) {
    const days = (dueDate.getTime() - now.getTime()) / 86_400_000;
    if (days <= 3) cues.push(`due in ${Math.max(0, Math.ceil(days))} day(s)`);
  }
  if (cues.length) return { urgency: "high", cues };
  if (low.length) return { urgency: "low", cues: low };
  return { urgency: "normal", cues: [] };
}

export function effort(text: string, jobType: JobType): { effort: Effort; cues: string[] } {
  const norm = normalise(text);
  const big = LARGE_ITEMS.filter((c) => has(norm, c));
  const small = SMALL_ITEMS.filter((c) => has(norm, c));
  const work = LARGE_WORK.filter((c) => has(norm, c));
  const qty = norm.match(/\b([2-9]|1[0-9]|two|three|four|five|six|eight)\s+(chair|stool|panel|door|cushion)/);
  const cues = [...big, ...(qty ? [qty[0]] : []), ...(jobType === "custom" ? ["custom build"] : [])];
  if (jobType === "custom" || big.length || qty || (work.length >= 2 && !small.length)) {
    return { effort: jobType === "custom" || (big.length && work.length) ? "L" : "M", cues: cues.length ? cues : work };
  }
  if (small.length) return { effort: "S", cues: small };
  return { effort: "M", cues: [] };
}

export function secondaryLabels(
  text: string,
  jobModel: NBModel<JobType>,
  dueDate?: Date | null,
  now?: Date,
): SecondaryLabels {
  const p = predict(jobModel, text).probabilities;
  const [jobType, jobTypeConfidence] = (Object.entries(p) as [JobType, number][]).sort((a, b) => b[1] - a[1])[0];
  const u = urgency(text, dueDate, now);
  const e = effort(text, jobType);
  return { jobType, jobTypeConfidence, urgency: u.urgency, urgencyCues: u.cues, effort: e.effort, effortCues: e.cues };
}

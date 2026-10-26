// Canonical capabilities. A shop maps its own workshops onto these,
// so the same model works for any shop regardless of what they call
// their workshops ("Polsterei", "Sofa unit", "Upholstery room").
export const CAPABILITIES = ["carpentry", "upholstery", "finishing", "metal"] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  carpentry: "Carpentry / wood structure",
  upholstery: "Upholstery / fabric & foam",
  finishing: "Finishing / polish & paint",
  metal: "Metalwork / frames & welding",
};

export const JOB_TYPES = ["repair", "custom", "refurbish", "assembly"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export type Urgency = "high" | "normal" | "low";
export type Effort = "S" | "M" | "L";

// auto   = routed without a human, high confidence
// check  = routed, but flagged for a quick look
// review = not routed, waits in the review queue
export type Gate = "auto" | "check" | "review";

export type DecisionSource = "rules+model" | "model" | "llm" | "manual";

export interface Evidence {
  token: string;
  capability: Capability;
  weight: number;
}

export interface RoutingDecision {
  capability: Capability | null;
  secondary: Capability | null; // "also involves", e.g. reupholster + fix frame
  confidence: number; // 0..1, probability of the top class
  margin: number; // top minus runner-up
  gate: Gate;
  source: DecisionSource;
  probabilities: Record<Capability, number>;
  evidence: Evidence[];
  reason: string; // plain-language explanation shown in the UI
  llmQuote?: string; // verbatim quote the LLM had to cite
}

export interface SecondaryLabels {
  jobType: JobType;
  jobTypeConfidence: number;
  urgency: Urgency;
  urgencyCues: string[];
  effort: Effort;
  effortCues: string[];
}

export interface Classification {
  routing: RoutingDecision;
  labels: SecondaryLabels;
}

export interface LabeledExample {
  text: string;
  capability: Capability;
  jobType: JobType;
}

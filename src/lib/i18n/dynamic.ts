import { CAPABILITIES, type Capability } from "../classifier/types";
import { translate, type Locale, type MsgKey } from "./index";

// Routing reasons and order-history lines are written in English when the order
// is created and stored as plain text. To show them in German without a data
// migration, each known template is matched here and re-rendered; anything
// unrecognised (for example a future template) is shown as stored.
// tests/i18n.test.ts feeds the real generators through these so a changed
// English template cannot silently stop translating.

const esc = (s: string) => s.replace(/[.*+?^${}()[\]\\|]/g, "\\$&");

const ENGLISH_CAP = Object.fromEntries(CAPABILITIES.map((c) => [translate("en", `cap.${c}`), c])) as Record<string, Capability>;
const CAP_ALT = Object.keys(ENGLISH_CAP).map(esc).join("|");

// Builds a global regex from an English template: {a} / {b} match a capability
// label, other placeholders match free text.
function pattern(key: MsgKey, slots: Record<string, string>, anchored = false): RegExp {
  const src = esc(translate("en", key)).replace(/\\\{(\w+)\\\}/g, (_, name) => `(?<${name}>${slots[name] ?? ".+?"})`);
  return new RegExp(anchored ? `^${src}$` : src, "g");
}

const capSlots = { a: CAP_ALT, b: CAP_ALT };

const REASONS: [MsgKey, Record<string, string>][] = [
  ["reason.noWords", {}],
  ["reason.disagree", capSlots],
  ["reason.clear", capSlots],
  ["reason.probably", capSlots],
  ["reason.close", capSlots],
  ["reason.noWorkshop", capSlots],
  ["reason.llmUnclear", {}],
  ["reason.llmNoWorkshop", {}],
  ["reason.llmBadQuote", {}],
  ["reason.llmUnavailable", {}],
  ["reason.llmFailed", { code: "\\d+" }],
  ["reason.llmRouted", { quote: ".*" }],
];

export function localizeReason(locale: Locale, reason: string): string {
  if (locale === "en") return reason;
  let out = reason;
  for (const [key, slots] of REASONS) {
    out = out.replace(pattern(key, slots), (...args) => {
      const last = args[args.length - 1];
      const g = (typeof last === "object" ? last : {}) as Record<string, string>; // groups exist only when the template has placeholders
      const params: Record<string, string> = { ...g };
      for (const k of ["a", "b"]) if (g[k]) params[k] = translate(locale, `cap.${ENGLISH_CAP[g[k]]}`);
      return translate(locale, key, params);
    });
  }
  return out;
}

const STATUS_WORDS: Record<string, MsgKey> = {
  "not started": "status.not_started",
  "in progress": "status.in_progress",
  done: "status.done",
};

const EVENTS: [MsgKey, Record<string, string>][] = [
  ["event.review", { conf: "\\S+" }],
  ["event.routedCheck", { conf: "\\S+", source: "\\S+" }],
  ["event.routed", { conf: "\\S+", source: "\\S+" }],
  ["event.status", { status: "(?:not started|in progress|done)" }],
  ["event.dateSet", { date: "\\d{4}-\\d{2}-\\d{2}" }],
  ["event.dateCleared", {}],
  ["event.split", {}],
  ["event.unsplit", {}],
  ["event.partStatus", { status: "(?:not started|in progress|done)" }],
  ["event.partDateSet", { date: "\\d{4}-\\d{2}-\\d{2}" }],
  ["event.partDateCleared", {}],
  ["event.emailed", {}],
];

export function localizeEvent(locale: Locale, detail: string): string {
  if (locale === "en") return detail;
  // "Moved|Assigned to X (the model learns from this)"
  const learns = translate("en", "event.learns");
  const hasLearns = detail.endsWith(learns);
  const core = hasLearns ? detail.slice(0, -learns.length) : detail;
  for (const key of ["event.moved", "event.assigned"] as const) {
    const m = pattern(key, {}, true).exec(core);
    if (m?.groups) return translate(locale, key, m.groups) + (hasLearns ? translate(locale, "event.learns") : "");
  }
  for (const [key, slots] of EVENTS) {
    const m = pattern(key, slots, true).exec(detail);
    if (!m) continue;
    const g = { ...m.groups };
    if (g.status) g.status = translate(locale, STATUS_WORDS[g.status]);
    return translate(locale, key, g);
  }
  return detail;
}

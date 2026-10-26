import { normalise } from "./text";
import { CAPABILITIES, CAPABILITY_LABELS, type Capability, type RoutingDecision } from "./types";

// Optional third layer. Only requests the cheap layers sent to review
// ever reach it, and it must quote the request word for word. If the
// quote is not actually in the text, the answer is thrown away and the
// order stays in review ("unverifiable" beats a confident guess).

export function llmEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

interface LlmAnswer {
  capability: Capability | "unclear";
  quote: string;
}

export function quoteIsVerbatim(quote: string, text: string): boolean {
  const q = normalise(quote);
  return q.length >= 3 && normalise(text).includes(q);
}

export async function adjudicate(text: string, decision: RoutingDecision, available: Capability[]): Promise<RoutingDecision> {
  if (!llmEnabled() || decision.gate !== "review") return decision;

  const options = CAPABILITIES.filter((c) => available.includes(c))
    .map((c) => `- ${c}: ${CAPABILITY_LABELS[c]}`)
    .join("\n");

  const prompt = `A furniture shop received this customer request. Decide which workshop should handle it.

Workshops:
${options}

Request:
"""${text}"""

Answer with JSON only: {"capability": "<one of the ids above, or unclear>", "quote": "<the exact words from the request that decide it>"}.
The quote must be copied exactly from the request. If the request does not say enough to decide, use "unclear".`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return { ...decision, reason: `${decision.reason} (LLM check failed: HTTP ${res.status})` };
    const body = await res.json();
    const raw: string = body?.content?.[0]?.text ?? "";
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const ans = JSON.parse(json) as LlmAnswer;

    if (ans.capability === "unclear" || !CAPABILITIES.includes(ans.capability as Capability)) {
      return { ...decision, reason: `${decision.reason} The LLM also found it unclear.` };
    }
    if (!available.includes(ans.capability)) {
      return { ...decision, reason: `${decision.reason} The LLM picked a workshop this shop does not have.` };
    }
    if (!quoteIsVerbatim(ans.quote, text)) {
      return { ...decision, reason: `${decision.reason} The LLM's citation was not in the request, so it was ignored.` };
    }
    return {
      ...decision,
      capability: ans.capability,
      gate: "check", // an LLM decision is never fully automatic
      source: "llm",
      llmQuote: ans.quote,
      reason: `Routed by the LLM, citing: "${ans.quote}".`,
    };
  } catch {
    return { ...decision, reason: `${decision.reason} (LLM check unavailable)` };
  }
}

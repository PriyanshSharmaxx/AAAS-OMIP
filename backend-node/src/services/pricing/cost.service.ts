/**
 * src/services/pricing/cost.service.ts
 *
 * Calculates the credit cost for running an agent.
 *
 * Cost breakdown:
 *   base  : 1 credit every run (covers platform overhead)
 *   tools : variable per tool (integration-specific cost)
 *   model : varies by LLM tier (premium models cost more)
 *
 * Free agents always return cost = 0.
 */

// ---------------------------------------------------------------------------
// Per-tool credit costs (matched by substring on tool name)
// ---------------------------------------------------------------------------

const TOOL_COST_MAP: Array<[pattern: RegExp, credits: number]> = [
  [/gmail/i,    2],
  [/email/i,    2],
  [/smtp/i,     2],
  [/api/i,      2],
  [/github/i,   1],
  [/database/i, 1],
  [/\bdb\b/i,   1],
  [/sql/i,      1],
  [/slack/i,    1],
  [/webhook/i,  1],
  [/twitter/i,  2],
  [/linkedin/i, 2],
  [/ocr/i,      2],
  [/pdf/i,      1],
  [/cloud/i,    2],
];

function costForTool(toolName: string): number {
  for (const [pattern, credits] of TOOL_COST_MAP) {
    if (pattern.test(toolName)) return credits;
  }
  return 1; // default: 1 credit per unknown tool
}

// ---------------------------------------------------------------------------
// Per-model credit costs
// ---------------------------------------------------------------------------

const MODEL_COST_MAP: Array<[pattern: RegExp, credits: number]> = [
  // Premium / GPT-4-class
  [/gpt-4(?!o-mini)/i,         3],
  [/gpt-4-turbo/i,             3],
  [/claude-opus/i,             3],
  // Mid-tier
  [/gpt-4o(?!-mini)/i,        2],
  [/claude-sonnet/i,           2],
  [/claude-3-5/i,              2],
  // Cheap / small
  [/gpt-4o-mini/i,             1],
  [/claude-haiku/i,            1],
  [/gpt-3\.5/i,                1],
];

function costForModel(model: string): number {
  for (const [pattern, credits] of MODEL_COST_MAP) {
    if (pattern.test(model)) return credits;
  }
  return 2; // default: mid-tier cost
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CostBreakdown {
  base:  number;
  tools: number;
  model: number;
  total: number;
}

/**
 * calculateCost — returns the credit cost for running the given agent.
 *
 * @param agent  Partial agent record with tools, model, and pricing fields.
 */
export function calculateCost(agent: {
  tools:   unknown;         // JSON from DB — array of tool objects or strings
  model:   string;
  pricing: string;          // "free" | "paid"
  listing?: { pricePerRun: any; pricingModel: string } | null;
}): CostBreakdown {

  // Free agents never consume credits
  if (agent.pricing === "free") {
    return { base: 0, tools: 0, model: 0, total: 0 };
  }

  const base = 1;

  // Normalise tools JSON → array of name strings
  const toolsArr = Array.isArray(agent.tools) ? agent.tools : [];
  let toolCost = 0;
  for (const t of toolsArr) {
    const name: string =
      typeof t === "string"
        ? t
        : ((t as Record<string, unknown>)?.name as string | undefined) ?? "";
    if (name) toolCost += costForTool(name);
  }

  const modelCost = costForModel(agent.model);

  // Add marketplace cost if applicable (PER_RUN model)
  const marketplaceCost = agent.listing?.pricingModel === "PER_RUN" 
    ? Number(agent.listing.pricePerRun || 0) 
    : 0;

  return {
    base,
    tools: toolCost,
    model: modelCost,
    total: base + toolCost + modelCost + marketplaceCost,
  };
}

export type ModelProvider = "openrouter";

export interface GatewayModel {
  id: string;
  name: string;
  provider: ModelProvider;
  description?: string;
}

// Curated list of models available through OpenRouter.
export const MODELS: GatewayModel[] = [
  // OpenRouter free-tier models.
  {
    id: "openrouter/z-ai/glm-5.2:free",
    name: "GLM 5.2 Free",
    provider: "openrouter",
    description: "Z-AI GLM 5.2 — free via OpenRouter",
  },
  {
    id: "openrouter/dots-studio/dots-3-note-preview:free",
    name: "Dots 3 Note Preview Free",
    provider: "openrouter",
    description: "dots-studio dots-3-note-preview — free",
  },
  {
    id: "openrouter/minimax/minimax-m3:free",
    name: "MiniMax M3 Free",
    provider: "openrouter",
    description: "MiniMax M3 — free via OpenRouter",
  },
  {
    id: "openrouter/inclusionai/ling-3.0-flash-fin:free",
    name: "Ling 3.0 Flash Fin Free",
    provider: "openrouter",
    description: "InclusionAI Ling 3.0 Flash Fin — finance-focused MoE, 262K context — free via OpenRouter",
  },
];

export const DEFAULT_MODEL = "openrouter/inclusionai/ling-3.0-flash-fin:free";

export function isModelAllowed(id: string) {
  return MODELS.some((m) => m.id === id);
}

export function getModelById(id: string) {
  return MODELS.find((m) => m.id === id);
}

export function getProviderFromModelId(id: string): ModelProvider | undefined {
  const prefix = id.split("/")[0];
  if (prefix === "openrouter") return prefix;
  return undefined;
}

export type ModelProvider = "openai" | "anthropic" | "google" | "openrouter";

export interface GatewayModel {
  id: string;
  name: string;
  provider: ModelProvider;
  description?: string;
}

// Curated list - user can choose any of these 4 providers
export const MODELS: GatewayModel[] = [
  // OpenAI
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Flagship OpenAI model, strong all-rounder",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "openai",
    description: "Fast, cheaper OpenAI model",
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "openai",
    description: "Next-gen OpenAI reasoning model",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 mini",
    provider: "openai",
    description: "Smaller GPT-5 for speed/cost",
  },
  // Anthropic
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    description: "Balanced Anthropic for marketing work",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    description: "Latest Sonnet with improved reasoning",
  },
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    description: "Most capable Anthropic model",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    description: "Fast Anthropic for lightweight tasks",
  },
  // Google
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    description: "Google flagship, 1M context",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "Fast Google model",
  },
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    description: "Lightweight Google",
  },
  // OpenRouter (free tier models as requested)
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
];

export const DEFAULT_MODEL = MODELS[1]?.id ?? "openai/gpt-4o-mini";

export function isModelAllowed(id: string) {
  return MODELS.some((m) => m.id === id);
}

export function getModelById(id: string) {
  return MODELS.find((m) => m.id === id);
}

export function getProviderFromModelId(id: string): ModelProvider | undefined {
  const prefix = id.split("/")[0];
  if (
    prefix === "openai" ||
    prefix === "anthropic" ||
    prefix === "google" ||
    prefix === "openrouter"
  )
    return prefix as ModelProvider;
  return undefined;
}

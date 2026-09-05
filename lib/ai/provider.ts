import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { getProviderFromModelId } from "@/lib/models";

type SupportedModelId = string;

function getRequiredApiKey(
  envVar: "OPENROUTER_API_KEY"
): string {
  const key = process.env[envVar]?.trim();
  if (!key) {
    throw new Error(`${envVar} is required for OpenRouter models. Set it in .env.local`);
  }
  return key;
}

const openRouterProviderCache = new Map<string, ReturnType<typeof createOpenAI>>();

function getOpenRouterProvider(apiKey: string) {
  const cached = openRouterProviderCache.get(apiKey);
  if (cached) return cached;
  const p = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: {
      "HTTP-Referer": "https://oxy-ai.local",
      "X-Title": "Oxy AI",
    },
  });
  openRouterProviderCache.set(apiKey, p);
  return p;
}

export function getModel(modelId: SupportedModelId): LanguageModel {
  const provider = getProviderFromModelId(modelId);
  if (!provider) {
    throw new Error(`Unknown provider for model "${modelId}". Expected an openrouter/ model.`);
  }
  const providerModelId = modelId.slice(provider.length + 1);
  if (!providerModelId) throw new Error(`Invalid model id "${modelId}"`);

  switch (provider) {
    case "openrouter": {
      const key = getRequiredApiKey("OPENROUTER_API_KEY");
      // openrouter models already include sub-provider prefix like z-ai/glm-5.1 -> pass as-is
      return getOpenRouterProvider(key).chat(providerModelId);
    }
  }
}

export function isProviderConfigured(provider: string): boolean {
  if (provider === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  return false;
}

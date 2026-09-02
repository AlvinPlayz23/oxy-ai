import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { getProviderFromModelId } from "@/lib/models";

type SupportedModelId = string;

function getRequiredApiKey(
  envVar: "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "GOOGLE_GENERATIVE_AI_API_KEY" | "OPENROUTER_API_KEY"
): string {
  const key = process.env[envVar]?.trim();
  if (!key) {
    const label =
      envVar === "OPENAI_API_KEY"
        ? "OpenAI"
        : envVar === "ANTHROPIC_API_KEY"
          ? "Anthropic"
          : envVar === "GOOGLE_GENERATIVE_AI_API_KEY"
            ? "Google"
            : "OpenRouter";
    throw new Error(`${envVar} is required for ${label} models. Set it in .env.local`);
  }
  return key;
}

const openAIProviderCache = new Map<string, ReturnType<typeof createOpenAI>>();
const anthropicProviderCache = new Map<string, ReturnType<typeof createAnthropic>>();
const googleProviderCache = new Map<string, ReturnType<typeof createGoogleGenerativeAI>>();
const openRouterProviderCache = new Map<string, ReturnType<typeof createOpenAI>>();

function getOpenAIProvider(apiKey: string) {
  const cached = openAIProviderCache.get(apiKey);
  if (cached) return cached;
  const p = createOpenAI({ apiKey });
  openAIProviderCache.set(apiKey, p);
  return p;
}

function getAnthropicProvider(apiKey: string) {
  const cached = anthropicProviderCache.get(apiKey);
  if (cached) return cached;
  const p = createAnthropic({ apiKey });
  anthropicProviderCache.set(apiKey, p);
  return p;
}

function getGoogleProvider(apiKey: string) {
  const cached = googleProviderCache.get(apiKey);
  if (cached) return cached;
  const p = createGoogleGenerativeAI({ apiKey });
  googleProviderCache.set(apiKey, p);
  return p;
}

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
    throw new Error(`Unknown provider for model "${modelId}". Expected one of openai/, anthropic/, google/, openrouter/`);
  }
  const providerModelId = modelId.slice(provider.length + 1);
  if (!providerModelId) throw new Error(`Invalid model id "${modelId}"`);

  switch (provider) {
    case "openai": {
      const key = getRequiredApiKey("OPENAI_API_KEY");
      return getOpenAIProvider(key)(providerModelId);
    }
    case "anthropic": {
      const key = getRequiredApiKey("ANTHROPIC_API_KEY");
      return getAnthropicProvider(key)(providerModelId);
    }
    case "google": {
      const key = getRequiredApiKey("GOOGLE_GENERATIVE_AI_API_KEY");
      return getGoogleProvider(key)(providerModelId);
    }
    case "openrouter": {
      const key = getRequiredApiKey("OPENROUTER_API_KEY");
      // openrouter models already include sub-provider prefix like z-ai/glm-5.1 -> pass as-is
      return getOpenRouterProvider(key).chat(providerModelId);
    }
  }
}

export function isProviderConfigured(provider: string): boolean {
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY?.trim());
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  if (provider === "google") return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
  if (provider === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  return false;
}

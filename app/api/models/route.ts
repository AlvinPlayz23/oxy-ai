import { MODELS } from "@/lib/models";
import { isProviderConfigured } from "@/lib/ai/provider";

export async function GET() {
  // Filter to configured providers if keys present; otherwise return all for UI demo
  // (chat route will error at execution if key missing, which is intentional)
  const hasAnyKey = isProviderConfigured("openrouter");

  const models = hasAnyKey
    ? MODELS.filter((m) => isProviderConfigured(m.provider))
    : MODELS;

  // If no keys at all, still return all so user sees options
  const responseModels = models.length > 0 ? models : MODELS;

  return Response.json({ models: responseModels });
}

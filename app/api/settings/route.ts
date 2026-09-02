import { TOOLKIT_CATALOG } from "@/lib/ai/tools/composio-catalog";

export async function GET() {
  return Response.json(
    {
      composioConfigured: Boolean(process.env.COMPOSIO_API_KEY?.trim()),
      toolkits: TOOLKIT_CATALOG,
    },
    { headers: { "cache-control": "no-store" } }
  );
}

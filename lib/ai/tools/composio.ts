import type { ToolSet } from "ai";

import {
  buildSessionCookieValue,
  signSessionCookie,
  type VerifiedSessionIdentity,
} from "@/lib/ai/runtime/identity";

export type ComposioContext = {
  tools: ToolSet;
  setCookie?: string;
};

async function createComposioClient(apiKey: string) {
  const [{ Composio }, { VercelProvider }] = await Promise.all([
    import("@composio/core"),
    import("@composio/vercel"),
  ]);
  return new Composio({
    apiKey,
    provider: new VercelProvider(),
    allowTracking: false,
  });
}

type ComposioClient = Awaited<ReturnType<typeof createComposioClient>>;

let cachedClient: { apiKey: string; client: ComposioClient } | null = null;

async function getComposioClient(apiKey: string): Promise<ComposioClient> {
  if (cachedClient && cachedClient.apiKey === apiKey) return cachedClient.client;
  const client = await createComposioClient(apiKey);
  cachedClient = { apiKey, client };
  return client;
}

function logComposio(
  level: "info" | "error",
  event: string,
  details: Record<string, unknown>
) {
  console[level](JSON.stringify({ scope: "composio", event, ...details }));
}

function sameSelection(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((slug, index) => slug === b[index]);
}

export async function resolveComposioContext(
  toolkits: string[],
  identity: VerifiedSessionIdentity | null
): Promise<ComposioContext | null> {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey || toolkits.length === 0) return null;

  try {
    const client = await getComposioClient(apiKey);

    let session: Awaited<ReturnType<ComposioClient["create"]>> | null = null;
    if (identity && identity.composioSessionId) {
      session = await client.use(identity.composioSessionId).catch((error) => {
        logComposio("info", "session.resume_failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return null;
      });
    }

    let setCookie: string | undefined;
    if (session && identity) {
      const selectionChanged =
        identity.toolkits === null || !sameSelection(identity.toolkits, toolkits);
      if (selectionChanged) {
        await session.update({ toolkits });
        setCookie = buildSessionCookieValue(
          await signSessionCookie({
            userId: identity.userId,
            composioSessionId: identity.composioSessionId,
            toolkits,
          })
        );
        logComposio("info", "session.toolkits_updated", {
          sessionId: identity.composioSessionId,
          toolkitCount: toolkits.length,
        });
      }
    }

    if (!session) {
      const userId = identity?.userId ?? crypto.randomUUID();
      session = await client.create(userId, { toolkits });
      setCookie = buildSessionCookieValue(
        await signSessionCookie({
          userId,
          composioSessionId: session.sessionId,
          toolkits,
        })
      );
      logComposio("info", "session.created", {
        sessionId: session.sessionId,
        toolkitCount: toolkits.length,
      });
    }

    const tools = await session.tools({
      beforeExecute: ({ toolSlug, toolkitSlug, params }) => {
        logComposio("info", "tool.started", { toolSlug, toolkitSlug });
        return params;
      },
      afterExecute: ({ toolSlug, toolkitSlug, result }) => {
        logComposio("info", "tool.completed", {
          toolSlug,
          toolkitSlug,
          successful:
            typeof result?.successful === "boolean" ? result.successful : null,
        });
        return result;
      },
    });

    return { tools, setCookie };
  } catch (error) {
    logComposio("error", "context.failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}

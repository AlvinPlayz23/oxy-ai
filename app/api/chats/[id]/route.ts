import {
  readSessionCookie,
  verifySessionCookie,
} from "@/lib/ai/runtime/identity";
import { getDb } from "@/lib/db";
import { deleteChat, getChatWithMessages } from "@/lib/db/queries";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveContext(req: Request, params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return { error: "not-found" as const };
  const db = getDb();
  if (!db) return { error: "not-found" as const };
  const identity = await verifySessionCookie(
    readSessionCookie(req.headers.get("cookie"))
  );
  if (!identity) return { error: "not-found" as const };
  return { db, chatId: id, userId: identity.userId };
}

function logChatsApi(event: string, error: unknown) {
  console.error(
    JSON.stringify({
      scope: "chats-api",
      event,
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveContext(req, params);
  if ("error" in context) {
    return Response.json({ error: "Chat not found." }, { status: 404 });
  }

  try {
    const chat = await getChatWithMessages(context.db, context.chatId, context.userId);
    if (!chat) {
      return Response.json({ error: "Chat not found." }, { status: 404 });
    }
    return Response.json({ chat });
  } catch (error) {
    logChatsApi("get.failed", error);
    return Response.json(
      { error: "Could not load the chat." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await resolveContext(req, params);
  if ("error" in context) {
    return Response.json({ error: "Chat not found." }, { status: 404 });
  }

  try {
    const deleted = await deleteChat(context.db, context.chatId, context.userId);
    if (!deleted) {
      return Response.json({ error: "Chat not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    logChatsApi("delete.failed", error);
    return Response.json(
      { error: "Could not delete the chat." },
      { status: 500 }
    );
  }
}

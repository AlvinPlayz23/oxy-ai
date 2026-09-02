import {
  readSessionCookie,
  verifySessionCookie,
} from "@/lib/ai/runtime/identity";
import { getDb } from "@/lib/db";
import { listChats } from "@/lib/db/queries";

export async function GET(req: Request) {
  const db = getDb();
  if (!db) {
    return Response.json({ chats: [], enabled: false });
  }

  const identity = await verifySessionCookie(
    readSessionCookie(req.headers.get("cookie"))
  );
  if (!identity) {
    return Response.json({ chats: [], enabled: true });
  }

  try {
    const chats = await listChats(db, identity.userId);
    return Response.json({ chats, enabled: true });
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: "chats-api",
        event: "list.failed",
        errorType: error instanceof Error ? error.name : "UnknownError",
      })
    );
    return Response.json(
      { error: "Could not load chat history." },
      { status: 500 }
    );
  }
}

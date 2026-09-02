import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MODELS } from "@/lib/models";
import { Chat } from "@/components/chat";
import { verifySessionCookie } from "@/lib/ai/runtime/identity";
import { getDb } from "@/lib/db";
import { getChatWithMessages } from "@/lib/db/queries";
import type { ChatUIMessage } from "@/lib/ai/tools";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const db = getDb();
  if (!db) notFound();

  const cookieStore = await cookies();
  const identity = await verifySessionCookie(
    cookieStore.get("oxy_session")?.value ?? null
  );
  if (!identity) notFound();

  const chat = await getChatWithMessages(db, id, identity.userId);
  if (!chat) notFound();

  // Messages were validated when originally written, so the round-trip is safe.
  return (
    <Chat
      models={MODELS}
      chatId={chat.id}
      initialMessages={chat.messages as unknown as ChatUIMessage[]}
    />
  );
}

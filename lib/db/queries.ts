import { asc, eq, and, desc } from "drizzle-orm";

import { chats, messages } from "./schema";
import { deriveTitle } from "./title";
import type { OxyDb } from "./index";

// Structural subset of the AI SDK UIMessage shape we persist.
export type PersistableMessage = {
  id: string;
  role: string;
  parts: Array<Record<string, unknown>>;
};

export type ChatSummary = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredChat = ChatSummary & {
  messages: PersistableMessage[];
};

export async function listChats(
  db: OxyDb,
  userId: string,
  limit = 100
): Promise<ChatSummary[]> {
  const rows = await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(limit);
  return rows;
}

export async function getChatWithMessages(
  db: OxyDb,
  chatId: string,
  userId: string
): Promise<StoredChat | null> {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);
  if (!chat) return null;

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.position));

  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messages: rows.map((row) => ({
      id: row.id,
      role: row.role,
      parts: (row.parts ?? []) as Array<Record<string, unknown>>,
    })),
  };
}

export async function saveChat(
  db: OxyDb,
  options: {
    chatId: string;
    userId: string;
    messages: ReadonlyArray<PersistableMessage>;
  }
): Promise<void> {
  const title = deriveTitle(options.messages);
  await db.transaction(async (tx) => {
    await tx
      .insert(chats)
      .values({ id: options.chatId, userId: options.userId, title })
      .onConflictDoUpdate({
        target: chats.id,
        set: { updatedAt: new Date() },
      });
    await tx.delete(messages).where(eq(messages.chatId, options.chatId));
    if (options.messages.length > 0) {
      await tx.insert(messages).values(
        options.messages.map((message, position) => ({
          id: message.id,
          chatId: options.chatId,
          role: message.role,
          position,
          parts: message.parts,
        }))
      );
    }
  });
}

export async function deleteChat(
  db: OxyDb,
  chatId: string,
  userId: string
): Promise<boolean> {
  const deleted = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .returning({ id: chats.id });
  return deleted.length > 0;
}

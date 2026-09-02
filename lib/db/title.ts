// Pure helpers live in their own module so node --test can import them
// without pulling in drizzle (Node ESM requires explicit extensions on
// relative imports, which the bundler-resolved imports here don't use).

const MAX_TITLE_LENGTH = 60;

export type TitleMessage = {
  role: string;
  parts: Array<Record<string, unknown>>;
};

export function deriveTitle(
  messageList: ReadonlyArray<TitleMessage>
): string {
  const firstUser = messageList.find((message) => message.role === "user");
  if (!firstUser) return "New chat";
  const textPart = firstUser.parts.find(
    (part) => part.type === "text" && typeof part.text === "string"
  );
  if (!textPart) return "New chat";
  const cleaned = String(textPart.text).trim().replace(/\s+/g, " ");
  if (!cleaned) return "New chat";
  return cleaned.length > MAX_TITLE_LENGTH
    ? `${cleaned.slice(0, MAX_TITLE_LENGTH - 3)}...`
    : cleaned;
}

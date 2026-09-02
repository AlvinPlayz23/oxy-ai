export const MAX_CHAT_REQUEST_BYTES = 256 * 1024;
export const MAX_CHAT_MESSAGES = 64;

export type ParseChatRequestResult =
  | { ok: true; body: unknown; size: number }
  | { ok: false; status: 400 | 413; error: string };

export async function parseChatRequest(
  request: Request,
  maxBytes = MAX_CHAT_REQUEST_BYTES
): Promise<ParseChatRequestResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      return { ok: false, status: 413, error: "Request body is too large." };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, error: "Request body is too large." };
      }

      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return { ok: false, status: 400, error: "Could not read request body." };
  } finally {
    reader.releaseLock();
  }

  try {
    return { ok: true, body: JSON.parse(text) as unknown, size };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }
}

export function hasAllowedMessageCount(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const messages = (value as { messages?: unknown }).messages;
  return Array.isArray(messages) && messages.length <= MAX_CHAT_MESSAGES;
}

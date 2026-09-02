const SESSION_COOKIE_NAME = "oxy_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAX_PAYLOAD_BYTES = 2048;

export type SessionIdentity = {
  userId: string;
  composioSessionId: string;
  toolkits: string[];
};

export type VerifiedSessionIdentity = {
  userId: string;
  composioSessionId: string;
  // null = cookie issued before toolkit tracking existed
  toolkits: string[] | null;
};

let cachedSecret: Uint8Array | null = null;
let warnedAboutFallbackSecret = false;

function parseHexSecret(value: string): Uint8Array | null {
  const trimmed = value.trim();
  if (trimmed.length < 32 || trimmed.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return null;
  const bytes = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function getAppSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const configured = process.env.OXY_APP_SECRET;
  if (configured) {
    const parsed = parseHexSecret(configured);
    if (parsed) {
      cachedSecret = parsed;
      return cachedSecret;
    }
  }
  cachedSecret = crypto.getRandomValues(new Uint8Array(32));
  if (!warnedAboutFallbackSecret) {
    warnedAboutFallbackSecret = true;
    console.warn(
      JSON.stringify({
        scope: "identity",
        event: "secret.fallback",
        message:
          "OXY_APP_SECRET is missing or invalid; using a process-lifetime random secret. Session cookies will not survive restarts.",
      })
    );
  }
  return cachedSecret;
}

async function importHmacKey(secret: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    secret as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  let binary: string;
  try {
    binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signSessionCookie(
  identity: SessionIdentity,
  secret: Uint8Array = getAppSecret()
): Promise<string> {
  const payload = `${identity.userId}:${identity.composioSessionId}:${identity.toolkits.join(",")}`;
  const key = await importHmacKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  );
  return `${toBase64Url(new TextEncoder().encode(payload))}.${toBase64Url(signature)}`;
}

export async function verifySessionCookie(
  raw: string | null | undefined,
  secret: Uint8Array = getAppSecret()
): Promise<VerifiedSessionIdentity | null> {
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0 || separator === raw.length - 1) return null;

  const payloadBytes = fromBase64Url(raw.slice(0, separator));
  const signature = fromBase64Url(raw.slice(separator + 1));
  if (!payloadBytes || !signature) return null;
  if (payloadBytes.byteLength === 0 || payloadBytes.byteLength > MAX_PAYLOAD_BYTES) {
    return null;
  }

  const key = await importHmacKey(secret);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  if (!constantTimeEqual(expected, signature)) return null;

  const payload = new TextDecoder().decode(payloadBytes);
  const splitAt = payload.indexOf(":");
  if (splitAt <= 0 || splitAt === payload.length - 1) return null;

  const userId = payload.slice(0, splitAt);
  const rest = payload.slice(splitAt + 1);
  const toolkitSplitAt = rest.indexOf(":");
  const composioSessionId =
    toolkitSplitAt === -1 ? rest : rest.slice(0, toolkitSplitAt);
  const toolkits =
    toolkitSplitAt === -1
      ? null
      : rest
          .slice(toolkitSplitAt + 1)
          .split(",")
          .filter((slug) => slug.length > 0 && slug.length <= 64)
          .slice(0, 30);
  // composioSessionId may be empty: identity cookies are issued before any
  // Composio session exists (chat persistence needs a userId regardless).
  if (userId.length > 128 || composioSessionId.length > 256) {
    return null;
  }
  return { userId, composioSessionId, toolkits };
}

export function sessionCookieAttributes(): string {
  const parts = [
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function buildSessionCookieValue(signed: string): string {
  return `${SESSION_COOKIE_NAME}=${signed}; ${sessionCookieAttributes()}`;
}

export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const piece of cookieHeader.split(";")) {
    const trimmed = piece.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return trimmed.slice(SESSION_COOKIE_NAME.length + 1);
    }
  }
  return null;
}

export type EnsuredIdentity = {
  identity: VerifiedSessionIdentity;
  // Present only when a new cookie had to be issued.
  setCookie?: string;
};

export async function ensureIdentityCookie(
  request: Request
): Promise<EnsuredIdentity> {
  const existing = await verifySessionCookie(
    readSessionCookie(request.headers.get("cookie"))
  );
  if (existing) return { identity: existing };

  const identity: SessionIdentity = {
    userId: crypto.randomUUID(),
    composioSessionId: "",
    toolkits: [],
  };
  return {
    identity: { userId: identity.userId, composioSessionId: "", toolkits: [] },
    setCookie: buildSessionCookieValue(await signSessionCookie(identity)),
  };
}

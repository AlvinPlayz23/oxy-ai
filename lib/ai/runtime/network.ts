import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);
const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

export const MAX_REDIRECTS = 5;
export const MAX_REMOTE_RESPONSE_BYTES = 512 * 1024;

function normalizedHostname(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

export function isPublicIpAddress(value: string): boolean {
  if (!ipaddr.isValid(value)) return false;
  return ipaddr.process(value).range() === "unicast";
}

function isBlockedHostname(hostname: string): boolean {
  return (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  );
}

export async function validatePublicHttpUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not allowed.");
  }

  const hostname = normalizedHostname(url);
  if (!hostname || isBlockedHostname(hostname)) {
    throw new Error("The URL must use a public hostname.");
  }

  if (ipaddr.isValid(hostname)) {
    if (!isPublicIpAddress(hostname)) {
      throw new Error("Requests to private or reserved networks are not allowed.");
    }
    return url;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("The hostname could not be resolved.");
  }

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Error("The hostname resolves to a private or reserved network.");
  }

  return url;
}

export async function fetchPublicUrl(
  value: string,
  options: {
    signal: AbortSignal;
    headers?: HeadersInit;
    maxRedirects?: number;
  }
): Promise<{ response: Response; finalUrl: string }> {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  let url = await validatePublicHttpUrl(value);

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const response = await fetch(url, {
      signal: options.signal,
      headers: options.headers,
      redirect: "manual",
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: url.toString() };
    }

    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("Redirect response is missing a location.");
    if (redirects === maxRedirects) throw new Error("Too many redirects.");

    url = await validatePublicHttpUrl(new URL(location, url).toString());
  }

  throw new Error("Too many redirects.");
}

export async function readBoundedText(
  response: Response,
  maxBytes = MAX_REMOTE_RESPONSE_BYTES
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) return { text: "", truncated: false };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = maxBytes - size;
      if (value.byteLength > remaining) {
        if (remaining > 0) chunks.push(value.slice(0, remaining));
        size = maxBytes;
        truncated = true;
        await reader.cancel();
        break;
      }

      chunks.push(value);
      size += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { text: new TextDecoder().decode(bytes), truncated };
}

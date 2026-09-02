import { tool } from "ai";
import { z } from "zod";

import {
  fetchPublicUrl,
  readBoundedText,
} from "@/lib/ai/runtime/network";

const MAX_BODY_LENGTH = 20_000;
const MAX_DOWNLOAD_BYTES = 512 * 1024;
const TIMEOUT_MS = 12_000;

const ALLOWED_CONTENT_TYPES = [
  "application/json",
  "application/ld+json",
  "application/xhtml+xml",
  "application/xml",
  "text/",
];

function truncate(str: string, max: number): { text: string; truncated: boolean } {
  if (str.length <= max) return { text: str, truncated: false };
  return { text: str.slice(0, max), truncated: true };
}

export const webFetchTool = tool({
  description:
    "Fetch a URL and return its content as text/markdown. Use for reading docs, articles, pricing pages, or any URL the user provides. Handles HTML -> readable text fallback. No API key required.",
  inputSchema: z.object({
    url: z.string().url().max(2_048).describe("The public HTTP/HTTPS URL to fetch"),
    extractMode: z
      .enum(["text", "markdown"])
      .optional()
      .describe("How to extract content: 'text' (default) strips HTML, 'markdown' preserves headings/links loosely"),
    maxChars: z.number().int().min(1000).max(30_000).optional().describe("Max chars to return (default 20000)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    url: z.string(),
    status: z.number().nullable(),
    contentType: z.string().nullable(),
    body: z.string().optional(),
    truncated: z.boolean().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ url, extractMode = "text", maxChars = MAX_BODY_LENGTH }, { abortSignal }) => {
    const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
    const signal = abortSignal
      ? AbortSignal.any([abortSignal, timeoutSignal])
      : timeoutSignal;

    try {
      const { response: res, finalUrl } = await fetchPublicUrl(url, {
        signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 OxyAI/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/markdown;q=0.8,text/plain;q=0.7,*/*;q=0.5",
        },
      });

      const contentType = res.headers.get("content-type");
      const status = res.status;

      if (
        contentType &&
        !ALLOWED_CONTENT_TYPES.some((allowed) =>
          contentType.toLowerCase().includes(allowed)
        )
      ) {
        await res.body?.cancel();
        return {
          success: false,
          url: finalUrl,
          status,
          contentType,
          error: "The response is not a supported text content type.",
        };
      }

      if (!res.ok) {
        const { text: errBody } = await readBoundedText(res, 4_096).catch(() => ({
          text: "",
          truncated: false,
        }));
        const snippet = errBody.slice(0, 500).replace(/\s+/g, " ").trim();
        return {
          success: false,
          url: finalUrl,
          status,
          contentType,
          error: `Fetch failed with ${status} ${res.statusText}${snippet ? `: ${snippet}` : ""}`,
        };
      }

      const downloaded = await readBoundedText(res, MAX_DOWNLOAD_BYTES);
      let body = downloaded.text;

      // Basic HTML -> text/markdown extraction if content looks like HTML
      const isHtml = (contentType?.includes("text/html") || body.trimStart().startsWith("<!DOCTYPE") || body.trimStart().startsWith("<html")) && !contentType?.includes("application/json");
      if (isHtml) {
        if (extractMode === "markdown") {
          // Lightweight HTML -> markdown-ish: preserve headings and links, strip tags otherwise
          body = body
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
            .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
            .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
            .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, " ")
            .replace(/\n\s*\n\s*\n/g, "\n\n")
            .trim();
        } else {
          body = body
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, " ")
            .trim();
        }
      }

      const { text, truncated } = truncate(body, maxChars);

      return {
        success: true,
        url: finalUrl,
        status,
        contentType,
        body: text,
        truncated: downloaded.truncated || truncated,
      };
    } catch (e) {
      if (signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        return { success: false, url, status: null, contentType: null, error: `Fetch timed out after ${TIMEOUT_MS}ms` };
      }
      const message = e instanceof Error ? e.message : "Fetch failed.";
      return { success: false, url, status: null, contentType: null, error: message.slice(0, 300) };
    }
  },
});

import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

import { readBoundedText } from "@/lib/ai/runtime/network";

const SEARCH_TIMEOUT_MS = 10_000;
const MAX_SEARCH_RESPONSE_BYTES = 256 * 1024;
const MAX_SNIPPET_LENGTH = 1_000;

function withTimeout<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

const exaSearchInputSchema = z.object({
  query: z.string().trim().min(2).max(500).describe("Search query"),
  numResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Number of results to return (default 5)"),
  category: z
    .enum(["company", "research paper", "news", "pdf", "github", "tweet", "personal site", "linkedin profile", "financial report"])
    .optional()
    .describe("Optional category filter for Exa"),
});

const exaSearchOutputSchema = z.object({
  results: z.array(
    z.object({
      title: z.string().nullable(),
      url: z.string(),
      snippet: z.string().nullable(),
      publishedDate: z.string().nullable().optional(),
      score: z.number().nullable().optional(),
    })
  ),
  answer: z.string().nullable().optional(),
});

async function fallbackSearch(
  query: string,
  numResults: number,
  signal: AbortSignal
): Promise<{ results: { title: string | null; url: string; snippet: string | null }[]; answer: string | null }> {
  // Free DuckDuckGo HTML search — no API key required (like opencode's free search)
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);
    const { text: html } = await readBoundedText(res, MAX_SEARCH_RESPONSE_BYTES);

    // DuckDuckGo lite html has pattern: <a rel="nofollow" class="result__url" href="..."> and <h2 class="result__title"><a ...>Title</a>
    const results: { title: string | null; url: string; snippet: string | null }[] = [];
    // Extract result blocks
    const re = /class="result__title"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && results.length < numResults) {
      const rawUrl = m[1] ?? "";
      const rawTitle = m[2] ?? "";
      const rawSnippet = m[3] ?? "";
      // Decode DDG redirect: /l/?uddg=https%3A%2F%2Fexample.com...
      let url = rawUrl;
      try {
        if (url.includes("uddg=")) {
          const u = new URL(url, "https://duckduckgo.com");
          const uddg = u.searchParams.get("uddg");
          if (uddg) url = decodeURIComponent(uddg);
        } else if (url.startsWith("//")) url = "https:" + url;
        else if (url.startsWith("/")) url = "https://duckduckgo.com" + url;
      } catch {}
      const title = rawTitle.replace(/<[^>]+>/g, "").trim().slice(0, 300) || null;
      const snippet = rawSnippet.replace(/<[^>]+>/g, "").trim().slice(0, MAX_SNIPPET_LENGTH) || null;
      if (url.startsWith("http")) results.push({ title, url: url.slice(0, 2_048), snippet });
    }

    // Fallback simpler regex if first failed (extract any result__url)
    if (results.length === 0) {
      const urlRe = /class="result__url"[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
      while ((m = urlRe.exec(html)) !== null && results.length < numResults) {
        let url = (m[1] ?? "").trim();
        try {
          if (url.includes("uddg=")) {
            const u = new URL(url, "https://duckduckgo.com");
            const uddg = u.searchParams.get("uddg");
            if (uddg) url = decodeURIComponent(uddg);
          }
        } catch {}
        if (url.startsWith("http")) results.push({ title: (m[2] ?? "").trim().slice(0, 300) || null, url: url.slice(0, 2_048), snippet: null });
      }
    }

    return { results, answer: null };
  } catch (e) {
    const message = signal.aborted
      ? "Search timed out."
      : e instanceof Error
        ? e.message.slice(0, 200)
        : "Search failed.";
    return { results: [], answer: `Fallback search failed: ${message}` };
  }
}

export const exaSearchTool = tool({
  description:
    "Search the web using Exa AI. Use for up-to-date information, research, news, company info, and general web queries. Returns titles, URLs, snippets, and an optional AI answer.",
  inputSchema: exaSearchInputSchema,
  outputSchema: exaSearchOutputSchema,
  execute: async ({ query, numResults = 5, category }, { abortSignal }) => {
    const timeoutSignal = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
    const signal = abortSignal
      ? AbortSignal.any([abortSignal, timeoutSignal])
      : timeoutSignal;
    const apiKey = process.env.EXA_API_KEY?.trim();
    if (!apiKey) {
      // Free path — no key required (same as opencode's free websearch)
      const fb = await fallbackSearch(query, numResults, signal);
      return {
        results: fb.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          publishedDate: null,
          score: null,
        })),
        answer: fb.answer,
      };
    }

    const exa = new Exa(apiKey);

    try {
      const result = await withTimeout(
        exa.searchAndContents(query, {
          numResults,
          category: category as string | undefined,
          summary: true,
          text: { maxCharacters: 3000 },
          livecrawl: "fallback",
        } as unknown as Record<string, unknown>),
        signal
      );

      // exa-js types vary across versions; normalize
      const rawResults = (result as unknown as { results?: unknown[] })?.results ?? [];
      const results = rawResults.slice(0, numResults).map((r: unknown) => {
        const rec = r as Record<string, unknown>;
        return {
          title: ((rec.title as string | null) ?? null)?.slice(0, 300) ?? null,
          url: ((rec.url as string) ?? "").slice(0, 2_048),
          snippet:
            ((rec.summary as string | null) ??
              (rec.text as string | null) ??
              null)?.slice(0, MAX_SNIPPET_LENGTH) ?? null,
          publishedDate: (rec.publishedDate as string | null) ?? null,
          score: (rec.score as number | null) ?? null,
        };
      });

      // Optional answer synthesis from Exa (if available) or just snippets
      const answer = ((result as unknown as { answer?: string | null })?.answer ?? null)?.slice(0, 3_000) ?? null;

      return { results, answer };
    } catch (error) {
      const message = signal.aborted
        ? "Search timed out."
        : error instanceof Error
          ? error.message.slice(0, 200)
          : "Search failed.";
      return {
        results: [],
        answer: `Exa search failed: ${message}`,
      };
    }
  },
});

// Fallback plain search if you don't want contents
export const exaSearchSimpleTool = tool({
  description: "Simple Exa web search (titles + snippets only, faster)",
  inputSchema: exaSearchInputSchema,
  outputSchema: exaSearchOutputSchema,
  execute: async ({ query, numResults = 5 }, { abortSignal }) => {
    const timeoutSignal = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
    const signal = abortSignal
      ? AbortSignal.any([abortSignal, timeoutSignal])
      : timeoutSignal;
    const apiKey = process.env.EXA_API_KEY?.trim();
    if (!apiKey) {
      const fb = await fallbackSearch(query, numResults, signal);
      return {
        results: fb.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          publishedDate: null,
          score: null,
        })),
        answer: fb.answer,
      };
    }
    const exa = new Exa(apiKey);
    try {
      const res = await withTimeout(exa.search(query, { numResults }), signal);
      const raw = (res as unknown as { results?: unknown[] })?.results ?? [];
      return {
        results: raw.map((r: unknown) => {
          const rec = r as Record<string, unknown>;
          return {
            title: ((rec.title as string | null) ?? null)?.slice(0, 300) ?? null,
            url: ((rec.url as string) ?? "").slice(0, 2_048),
            snippet: (rec.text as string | null)?.slice(0, MAX_SNIPPET_LENGTH) ?? null,
            publishedDate: null,
            score: (rec.score as number | null) ?? null,
          };
        }),
        answer: null,
      };
    } catch (error) {
      const message = signal.aborted
        ? "Search timed out."
        : error instanceof Error
          ? error.message.slice(0, 200)
          : "Search failed.";
      return { results: [], answer: `Exa search failed: ${message}` };
    }
  },
});

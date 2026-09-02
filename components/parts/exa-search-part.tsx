import { GlobeIcon, ExternalLinkIcon } from "lucide-react";
import type { ExaSearchToolPart } from "@/lib/ai/tools";
import { safeHttpUrl } from "@/lib/utils";

export function ExaSearchPart({ part }: { part: ExaSearchToolPart }) {
  const query = part.input?.query ? ` for “${part.input.query}”` : "";

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
          <GlobeIcon className="size-4 animate-pulse" />
          Searching the web{query}…
        </div>
      );
    case "output-available": {
      const results = part.output?.results ?? [];
      const answer = part.output?.answer;
      return (
        <div className="flex flex-col gap-2 px-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GlobeIcon className="size-4" />
            Searched the web{query} — {results.length} results
          </div>
          {answer && (
            <div className="rounded-xl border bg-muted/30 p-3 text-sm">
              {answer}
            </div>
          )}
          {results.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {results.slice(0, 5).map((r) => {
                const safe = safeHttpUrl(r.url);
                return (
                  <a
                    key={r.url}
                    href={safe}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="block truncate font-medium">
                        {r.title || new URL(r.url).hostname}
                      </span>
                      {r.snippet && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.snippet.slice(0, 120)}
                        </span>
                      )}
                    </span>
                    <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    case "output-error":
      return (
        <div className="px-1.5 text-sm text-destructive">
          Exa search failed: {part.errorText}
        </div>
      );
    default:
      return null;
  }
}

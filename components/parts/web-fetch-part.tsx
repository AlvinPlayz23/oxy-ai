import { GlobeIcon, ExternalLinkIcon, AlertTriangleIcon, FileTextIcon } from "lucide-react";
import type { WebFetchToolPart } from "@/lib/ai/tools";
import { safeHttpUrl } from "@/lib/utils";

export function WebFetchPart({ part }: { part: WebFetchToolPart }) {
  const url = part.input?.url ?? "";
  const displayUrl = url ? (() => { try { return new URL(url).hostname; } catch { return url; } })() : "";

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
          <GlobeIcon className="size-4 animate-pulse" />
          Fetching {displayUrl || url}…
        </div>
      );
    case "output-available": {
      const out = part.output as { success: boolean; url: string; status: number | null; body?: string; truncated?: boolean; error?: string; contentType?: string | null };
      if (!out.success) {
        return (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-destructive">Fetch failed</div>
              <div className="truncate text-xs text-muted-foreground">{safeHttpUrl(out.url) ?? out.url}</div>
              {out.error && <div className="mt-1 text-sm text-destructive/80">{out.error}</div>}
            </div>
          </div>
        );
      }
      const body = out.body ?? "";
      const preview = body.slice(0, 600);
      return (
        <div className="flex flex-col gap-2 rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileTextIcon className="size-4 text-muted-foreground" />
              <a
                href={safeHttpUrl(out.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                {displayUrl} <ExternalLinkIcon className="size-3" />
              </a>
              {out.status && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{out.status}</span>}
              {out.truncated && <span className="text-xs text-muted-foreground">truncated</span>}
            </div>
            {out.contentType && <span className="hidden text-xs text-muted-foreground sm:block">{out.contentType.split(";")[0]}</span>}
          </div>
          <div className="max-h-64 overflow-auto px-3 pb-3">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">
              {preview}
              {body.length > 600 ? "…" : ""}
            </pre>
            <div className="mt-2 text-xs text-muted-foreground">{body.length.toLocaleString()} chars{out.truncated ? ` (showing first ${(out.body?.length ?? 0).toLocaleString()})` : ""}</div>
          </div>
        </div>
      );
    }
    case "output-error":
      return <div className="px-1.5 text-sm text-destructive">Fetch failed: {part.errorText}</div>;
    default:
      return null;
  }
}

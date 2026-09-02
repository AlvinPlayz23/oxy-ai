import { PlugIcon, ExternalLinkIcon, CheckIcon, AlertTriangleIcon, LinkIcon } from "lucide-react";
import type { DynamicToolUIPart } from "ai";
import { Button } from "@/components/ui/button";
import { TOOLKIT_CATALOG } from "@/lib/ai/tools/composio-catalog";
import { safeHttpUrl } from "@/lib/utils";

const MAX_OUTPUT_CHARS = 900;

const CONNECT_URL_KEYS = [
  "redirectUrl",
  "redirect_url",
  "connectLink",
  "connect_link",
  "authUrl",
  "auth_url",
  "connectionUrl",
  "connection_url",
  "connectUrl",
  "connect_url",
];

const TOOLKIT_KEYS = [
  "toolkit",
  "toolkitSlug",
  "toolkit_slug",
  "app",
  "appSlug",
  "app_slug",
  "appName",
];

type ConnectRequest = { url: string; appName?: string };

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim()) && Boolean(safeHttpUrl(value.trim()));
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveAppName(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const slug = value.trim().toLowerCase();
  const known = TOOLKIT_CATALOG.find((t) => t.slug === slug);
  return known ? known.name : humanizeSlug(slug);
}

function extractConnectRequest(value: unknown, depth = 0): {
  url: string | null;
  appName: string | null;
} {
  if (depth > 6 || value == null) return { url: null, appName: null };

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractConnectRequest(item, depth + 1);
      if (found.url || found.appName) return found;
    }
    return { url: null, appName: null };
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of CONNECT_URL_KEYS) {
      const candidate = record[key];
      if (typeof candidate === "string" && isHttpUrl(candidate)) {
        const appFromSibling =
          TOOLKIT_KEYS.map((k) => resolveAppName(record[k])).find(Boolean) ?? null;
        return { url: candidate.trim(), appName: appFromSibling };
      }
    }

    let appName: string | null = null;
    for (const key of TOOLKIT_KEYS) {
      appName = resolveAppName(record[key]);
      if (appName) break;
    }

    for (const item of Object.values(record)) {
      const found = extractConnectRequest(item, depth + 1);
      if (found.url) return { url: found.url, appName: found.appName ?? appName };
      if (!appName && found.appName) appName = found.appName;
    }
    return { url: null, appName };
  }

  if (typeof value === "string") {
    const candidate = value.trim();
    if (
      isHttpUrl(candidate) &&
      candidate.includes("composio") &&
      /auth|connect/i.test(candidate)
    ) {
      return { url: candidate, appName: null };
    }
  }

  return { url: null, appName: null };
}

function collectUrls(value: unknown, found: string[], depth = 0): void {
  if (found.length >= 3 || depth > 6 || value == null) return;
  if (typeof value === "string") {
    const candidate = value.trim();
    if (/^https?:\/\//i.test(candidate) && safeHttpUrl(candidate)) {
      found.push(candidate);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, found, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectUrls(item, found, depth + 1);
    }
  }
}

function humanizeToolName(toolName: string): string {
  return toolName
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function summarizeOutput(output: unknown): string {
  if (output == null) return "";
  const text = typeof output === "string" ? output : JSON.stringify(output, null, 2);
  return text.length > MAX_OUTPUT_CHARS ? `${text.slice(0, MAX_OUTPUT_CHARS)}…` : text;
}

function ConnectCard({ request }: { request: ConnectRequest }) {
  const safeUrl = safeHttpUrl(request.url);
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-3 rounded-xl border border-primary/25 bg-card px-4 py-3.5 duration-500">
      <div className="flex items-center gap-3">
        <span className="relative flex size-9 shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/15 [animation-duration:2.2s]" />
          <span className="relative flex size-9 items-center justify-center rounded-full bg-primary/10">
            <PlugIcon className="size-4.5 text-primary" />
          </span>
        </span>
        <div className="min-w-0">
          <div className="font-medium text-sm">
            Connect {request.appName ?? "your account"}
          </div>
          <div className="text-muted-foreground text-xs">
            Approve access in the new tab, then tell the agent to continue.
          </div>
        </div>
      </div>
      <div>
        <Button
          className="group/connect"
          render={<a href={safeUrl} rel="noreferrer" target="_blank" />}
          size="sm"
        >
          <LinkIcon className="size-3.5" />
          Connect {request.appName ?? "account"}
          <ExternalLinkIcon className="size-3.5 transition-transform duration-200 group-hover/connect:translate-x-0.5 group-hover/connect:-translate-y-0.5" />
        </Button>
      </div>
    </div>
  );
}

export function DynamicToolPart({ part }: { part: DynamicToolUIPart }) {
  const label = humanizeToolName(part.toolName);

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div className="flex items-center gap-2 px-1.5 text-sm text-muted-foreground">
          <PlugIcon className="size-4 animate-pulse" />
          Running {label}…
        </div>
      );
    case "output-available": {
      const { url, appName } = extractConnectRequest(part.output);
      if (url) {
        return <ConnectCard request={{ url, appName: appName ?? undefined }} />;
      }

      const urls: string[] = [];
      collectUrls(part.output, urls);
      const summary = summarizeOutput(part.output);
      return (
        <div className="flex flex-col gap-2 rounded-xl border bg-card px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <PlugIcon className="size-4" />
            {label}
            <CheckIcon className="size-3.5 text-green-600" />
          </div>
          {urls.map((foundUrl) => (
            <a
              className="inline-flex items-center gap-1 break-all text-sm text-primary hover:underline"
              href={safeHttpUrl(foundUrl)}
              key={foundUrl}
              rel="noreferrer"
              target="_blank"
            >
              {foundUrl} <ExternalLinkIcon className="size-3 shrink-0" />
            </a>
          ))}
          {summary && (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
              {summary}
            </pre>
          )}
        </div>
      );
    }
    case "output-error":
      return (
        <div className="flex items-start gap-2 px-1.5 text-sm text-destructive">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          {label} failed: {part.errorText}
        </div>
      );
    default:
      return null;
  }
}

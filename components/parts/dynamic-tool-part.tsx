"use client";

import { PlugIcon, ExternalLinkIcon, CheckIcon, AlertTriangleIcon } from "lucide-react";
import type { DynamicToolUIPart } from "ai";
import { ConnectButton } from "@/components/connect-button";
import { TOOLKIT_CATALOG } from "@/lib/ai/tools/composio-catalog";
import { safeHttpUrl } from "@/lib/utils";

const MAX_OUTPUT_CHARS = 900;

const CONNECT_URL_KEYS = [
  "redirectUrl",
  "redirect_url",
  "redirect_uri",
  "redirectUri",
  "redirect",
  "connectLink",
  "connect_link",
  "authUrl",
  "auth_url",
  "authUri",
  "auth_uri",
  "authLink",
  "auth_link",
  "connectionUrl",
  "connection_url",
  "connectionUri",
  "connection_uri",
  "connectUrl",
  "connect_url",
  "loginUrl",
  "login_url",
  "actionUrl",
  "action_url",
  "url",
  "link",
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

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim()) && Boolean(safeHttpUrl(value.trim()));
}

function isConnectOrRedirectUrl(url: string): boolean {
  if (!isHttpUrl(url)) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("redirect") ||
    lower.includes("connect") ||
    lower.includes("auth") ||
    lower.includes("oauth") ||
    lower.includes("login") ||
    lower.includes("authorize") ||
    lower.includes("composio") ||
    lower.includes("session")
  );
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

function getAppNameFromPart(part: DynamicToolUIPart): string | null {
  if (part.input && typeof part.input === "object") {
    const record = part.input as Record<string, unknown>;
    for (const key of TOOLKIT_KEYS) {
      const name = resolveAppName(record[key]);
      if (name) return name;
    }
  }
  const toolNameLower = part.toolName.toLowerCase();
  for (const toolkit of TOOLKIT_CATALOG) {
    if (toolNameLower.includes(toolkit.slug.toLowerCase())) {
      return toolkit.name;
    }
  }
  return null;
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

    for (const [key, candidate] of Object.entries(record)) {
      if (typeof candidate === "string" && isConnectOrRedirectUrl(candidate)) {
        return { url: candidate.trim(), appName };
      }
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
    if (isConnectOrRedirectUrl(candidate)) {
      return { url: candidate, appName: null };
    }
    const match = candidate.match(/https?:\/\/[^\s"'<>]+/i);
    if (match && isConnectOrRedirectUrl(match[0])) {
      return { url: match[0], appName: null };
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
      let { url, appName } = extractConnectRequest(part.output);
      const appNameFromPart = getAppNameFromPart(part);
      const finalAppName = appName ?? appNameFromPart ?? undefined;

      const urls: string[] = [];
      collectUrls(part.output, urls);

      if (!url) {
        const connectCandidate = urls.find(isConnectOrRedirectUrl);
        if (connectCandidate) {
          url = connectCandidate;
        }
      }

      if (url) {
        return <ConnectButton appName={finalAppName} href={url} />;
      }

      const summary = summarizeOutput(part.output);
      return (
        <div className="flex flex-col gap-2 rounded-xl border bg-card px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <PlugIcon className="size-4" />
            {label}
            <CheckIcon className="size-3.5 text-green-600" />
          </div>
          {urls.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {urls.map((foundUrl) => {
                const safe = safeHttpUrl(foundUrl);
                if (!safe) return null;
                let displayHost = safe;
                try {
                  displayHost = new URL(safe).hostname.replace(/^www\./, "");
                } catch {
                  // ignore
                }
                return (
                  <a
                    className="inline-flex max-w-fit items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
                    href={safe}
                    key={foundUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>{displayHost}</span>
                    <ExternalLinkIcon className="size-3 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          )}
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

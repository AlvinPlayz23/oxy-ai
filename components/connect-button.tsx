"use client";

import { ExternalLinkIcon, PlugIcon } from "lucide-react";
import { cn, safeHttpUrl } from "@/lib/utils";

type ConnectButtonProps = {
  appName?: string;
  className?: string;
  href: string;
};

export function ConnectButton({ appName, className, href }: ConnectButtonProps) {
  const safeHref = safeHttpUrl(href);

  if (!safeHref) return null;

  const displayName = appName?.trim() || "Account";

  return (
    <div className="my-1.5">
      <a
        className={cn(
          "group/connect relative inline-flex items-center gap-3 rounded-xl border border-primary/20",
          "bg-card/95 px-3.5 py-2.5 text-card-foreground shadow-xs",
          "hover:border-primary/40 hover:bg-card hover:shadow-md",
          "active:scale-[0.985] transition-colors duration-200 ease-out select-none outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "dark:border-border/60 dark:bg-card/60 dark:hover:border-primary/40 dark:hover:bg-card/90",
          className
        )}
        href={safeHref}
        rel="noreferrer"
        target="_blank"
      >
        {/* Static connection indicator */}
        <span className="pointer-events-none flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PlugIcon className="size-3.5" />
        </span>

        {/* Content text */}
        <div className="pointer-events-none flex flex-col text-left">
          <span className="flex items-center gap-1.5 font-medium text-xs leading-none tracking-tight text-foreground">
            Connect {displayName}
            <ExternalLinkIcon className="size-3 text-muted-foreground" />
          </span>
          <span className="mt-1 text-[11px] leading-none text-muted-foreground">
            Authorize in new tab to continue
          </span>
        </div>
      </a>
    </div>
  );
}

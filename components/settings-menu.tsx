"use client";

import { useEffect, useState } from "react";
import { PlugIcon, SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/components/settings-provider";
import { TOOLKIT_CATALOG } from "@/lib/ai/tools/composio-catalog";

type ServerSettings = {
  composioConfigured: boolean;
};

export function SettingsMenu() {
  const { settings, toggleComposioToolkit, setComposioToolkits } =
    useSettings();
  const [serverSettings, setServerSettings] = useState<ServerSettings | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          setServerSettings({
            composioConfigured:
              "composioConfigured" in data &&
              Boolean((data as ServerSettings).composioConfigured),
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = [...new Set(TOOLKIT_CATALOG.map((t) => t.category))];

  return (
    <Popover>
      <PopoverTrigger
        render={<Button aria-label="Settings" size="icon" variant="ghost" />}
      >
        <SettingsIcon />
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-80">
        <PopoverTitle>Settings</PopoverTitle>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <PlugIcon className="size-4 text-muted-foreground" />
            <span className="font-medium text-sm">Composio toolkits</span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            Choose which connected apps the agent may use. Apps need an
            account connection on first use — the agent will share a Connect
            Link when required.{" "}
            <a
              className="text-primary hover:underline"
              href="https://docs.composio.dev/docs"
              rel="noreferrer"
              target="_blank"
            >
              Docs
            </a>
          </p>

          <div className="mt-2 text-xs">
            {serverSettings === null ? (
              <span className="text-muted-foreground">Checking server…</span>
            ) : serverSettings.composioConfigured ? (
              <span className="text-green-600 dark:text-green-400">
                Server key configured — execution is live.
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                COMPOSIO_API_KEY not set on the server — tools stay inactive.
              </span>
            )}
          </div>

          <div className="mt-2 flex gap-3 text-xs">
            <button
              className="text-primary hover:underline"
              onClick={() =>
                setComposioToolkits(TOOLKIT_CATALOG.map((t) => t.slug))
              }
              type="button"
            >
              Enable all
            </button>
            <button
              className="text-primary hover:underline"
              onClick={() => setComposioToolkits([])}
              type="button"
            >
              Disable all
            </button>
          </div>

          <div className="mt-3 flex max-h-72 flex-col gap-4 overflow-y-auto pr-1">
            {categories.map((category) => (
                <div key={category}>
                  <div className="mb-1.5 text-muted-foreground text-xs tracking-wide uppercase">
                    {category}
                  </div>
                  <div className="flex flex-col gap-1">
                    {TOOLKIT_CATALOG.filter((t) => t.category === category).map(
                      (toolkit) => {
                        const enabled = settings.composioToolkits.includes(
                          toolkit.slug
                        );
                        return (
                          <div
                            className="flex items-center justify-between gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
                            key={toolkit.slug}
                          >
                            <Label
                              className="cursor-pointer font-normal text-sm"
                              htmlFor={`toolkit-${toolkit.slug}`}
                            >
                              {toolkit.name}
                            </Label>
                            <Switch
                              checked={enabled}
                              id={`toolkit-${toolkit.slug}`}
                              onCheckedChange={() =>
                                toggleComposioToolkit(toolkit.slug)
                              }
                            />
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

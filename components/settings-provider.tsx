"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DEFAULT_ENABLED_TOOLKITS,
  sanitizeToolkitSelection,
} from "@/lib/ai/tools/composio-catalog";

const STORAGE_KEY = "oxy-settings";

export type Settings = {
  composioToolkits: string[];
};

const DEFAULT_SETTINGS: Settings = {
  composioToolkits: DEFAULT_ENABLED_TOOLKITS,
};

type SettingsContextValue = {
  settings: Settings;
  setComposioToolkits: (slugs: string[]) => void;
  toggleComposioToolkit: (slug: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

let snapshotCache: { raw: string | null; settings: Settings } | null = null;
const listeners = new Set<() => void>();

function parseStored(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_SETTINGS;
    const candidate = parsed as { composioToolkits?: unknown };
    if (!Array.isArray(candidate.composioToolkits)) return DEFAULT_SETTINGS;
    return {
      composioToolkits: sanitizeToolkitSelection(candidate.composioToolkits),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getSnapshot(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (snapshotCache && snapshotCache.raw === raw) return snapshotCache.settings;
  const settings = parseStored(raw);
  snapshotCache = { raw, settings };
  return settings;
}

function getServerSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function writeSettings(next: Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota); nothing to persist.
  }
  snapshotCache = null;
  for (const listener of listeners) listener();
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setComposioToolkits = useCallback((slugs: string[]) => {
    writeSettings({ composioToolkits: sanitizeToolkitSelection(slugs) });
  }, []);

  const toggleComposioToolkit = useCallback((slug: string) => {
    const current = getSnapshot().composioToolkits;
    const next = current.includes(slug)
      ? current.filter((item) => item !== slug)
      : sanitizeToolkitSelection([...current, slug]);
    writeSettings({ composioToolkits: next });
  }, []);

  const value = useMemo(
    () => ({ settings, setComposioToolkits, toggleComposioToolkit }),
    [settings, setComposioToolkits, toggleComposioToolkit]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

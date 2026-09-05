"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <Button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="size-8 rounded-full text-muted-foreground hover:bg-mint-soft hover:text-oxy"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      size="icon-sm"
      variant="ghost"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

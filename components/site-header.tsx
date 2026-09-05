import Link from "next/link"

import { NewChatButton } from "@/components/new-chat-button"
import { SettingsMenu } from "@/components/settings-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="mx-3 mt-3 flex items-center justify-between gap-2 rounded-full border border-border/70 bg-background/72 px-4 py-2.5 shadow-sm backdrop-blur-[18px] backdrop-saturate-150 sm:mx-5 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <Link href="/" aria-label="Oxy AI home" className="text-sm font-medium">
          Chat
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <SettingsMenu />
        <NewChatButton />
      </div>
    </header>
  )
}

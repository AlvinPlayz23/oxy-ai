import Link from "next/link"

import { NewChatButton } from "@/components/new-chat-button"
import { SettingsMenu } from "@/components/settings-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-2 px-6 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <Link href="/" className="text-sm font-medium">
          Chat
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <SettingsMenu />
        <NewChatButton />
      </div>
    </header>
  )
}

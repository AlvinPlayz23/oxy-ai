"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlusIcon, TrashIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

type ChatSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

function relativeTime(value: string): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ""
  const minutes = Math.round((Date.now() - then) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

export function ChatHistorySidebar() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const [chats, setChats] = React.useState<ChatSummary[]>([])
  const [enabled, setEnabled] = React.useState(true)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/chats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setChats(Array.isArray(data.chats) ? data.chats : [])
        setEnabled(data.enabled !== false)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pathname])

  async function handleDelete(chat: ChatSummary) {
    setDeletingId(chat.id)
    try {
      const res = await fetch(`/api/chats/${chat.id}`, { method: "DELETE" })
      if (res.ok) {
        setChats((prev) => prev.filter((item) => item.id !== chat.id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/" />}
              onClick={() => setOpenMobile(false)}
            >
              <PlusIcon />
              New chat
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>History</SidebarGroupLabel>
          <SidebarGroupContent>
            {chats.length === 0 ? (
              <p className="px-2 py-1 text-sidebar-foreground/60 text-xs">
                {enabled
                  ? "No conversations yet."
                  : "History is not configured."}
              </p>
            ) : (
              <SidebarMenu>
                {chats.map((chat) => {
                  const isActive = pathname === `/chat/${chat.id}`
                  return (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        size="lg"
                        isActive={isActive}
                        render={<Link href={`/chat/${chat.id}`} />}
                        onClick={() => setOpenMobile(false)}
                        title={chat.title}
                      >
                        <span className="flex min-w-0 flex-col gap-1 text-left">
                          <span className="truncate">{chat.title}</span>
                          <span className="text-sidebar-foreground/60 text-xs">
                            {relativeTime(chat.updatedAt)}
                          </span>
                        </span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        showOnHover
                        disabled={deletingId === chat.id}
                        aria-label={`Delete chat: ${chat.title}`}
                        onClick={(event) => {
                          event.preventDefault()
                          void handleDelete(chat)
                        }}
                      >
                        <TrashIcon />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

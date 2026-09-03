"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion, type Variants } from "motion/react"
import { MessageSquarePlusIcon, PlusIcon, TrashIcon } from "lucide-react"

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
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

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

const listItem: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.3,
      ease: "easeOut",
      delay: Math.min(index, 8) * 0.04,
    },
  }),
}

export function ChatHistorySidebar() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const reduceMotion = useReducedMotion()
  const [chats, setChats] = React.useState<ChatSummary[]>([])
  const [enabled, setEnabled] = React.useState(true)
  const [loading, setLoading] = React.useState(true)
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
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
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
              className="group/new h-9 gap-2.5 bg-background font-medium shadow-(--sidebar-elevated) transition-[box-shadow,transform,background-color,color] duration-150 ease-out hover:shadow-(--sidebar-elevated-hover) active:scale-[0.96]"
            >
              <PlusIcon className="transition-transform duration-300 ease-out group-hover/new:rotate-90" />
              New chat
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            History
            {chats.length > 0 && (
              <span className="ml-auto text-sidebar-foreground/50 tabular-nums">
                {chats.length}
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {loading && chats.length === 0 ? (
              <SidebarMenu>
                {[0, 1, 2, 3].map((index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuSkeleton className="h-12" />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-accent">
                  <MessageSquarePlusIcon className="size-4 text-sidebar-foreground/50" />
                </div>
                <p className="text-sidebar-foreground/60 text-xs">
                  {enabled ? "No conversations yet." : "History is not configured."}
                </p>
              </div>
            ) : (
              <motion.div
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
              >
                <SidebarMenu>
                  {chats.map((chat, index) => {
                    const isActive = pathname === `/chat/${chat.id}`
                    return (
                      <SidebarMenuItem key={chat.id}>
                        <motion.div custom={index} variants={listItem}>
                          <SidebarMenuButton
                            size="lg"
                            isActive={isActive}
                            render={<Link href={`/chat/${chat.id}`} />}
                            onClick={() => setOpenMobile(false)}
                            title={chat.title}
                            className="data-[active=true]:ring-1 data-[active=true]:ring-sidebar-foreground/15"
                          >
                            <span className="flex min-w-0 flex-col gap-1 text-left">
                              <span className="truncate">{chat.title}</span>
                              <span
                                className={cn(
                                  "text-xs tabular-nums",
                                  isActive
                                    ? "text-sidebar-foreground/70"
                                    : "text-sidebar-foreground/60",
                                )}
                              >
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
                            className="transition-[opacity,scale,filter,background-color,color] duration-200 ease-out hover:text-destructive active:scale-[0.96] md:scale-[0.25] md:opacity-0 md:blur-[4px] md:group-hover/menu-item:scale-100 md:group-hover/menu-item:opacity-100 md:group-hover/menu-item:blur-0 md:group-focus-within/menu-item:scale-100 md:group-focus-within/menu-item:opacity-100 md:group-focus-within/menu-item:blur-0"
                          >
                            <TrashIcon />
                          </SidebarMenuAction>
                        </motion.div>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </motion.div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

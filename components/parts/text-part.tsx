import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { ConnectButton } from "@/components/connect-button"
import { type TextPart as TextMessagePart } from "@/lib/ai/tools"

function isComposioConnectUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.toLowerCase() === "connect.composio.dev" &&
      url.pathname.toLowerCase().startsWith("/link/")
    )
  } catch {
    return false
  }
}

function getConnectAppName(children: React.ReactNode): string | undefined {
  const text = React.Children.toArray(children)
    .filter((child): child is string => typeof child === "string")
    .join("")

  const match = text.match(/connect\s+(.+)/i)
  return match?.[1]?.trim() || undefined
}

export function TextPart({ part }: { part: TextMessagePart }) {
  if (!part.text.trim()) {
    return null
  }

  return (
    <div className="typeset typeset-docs px-1.5">
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => {
            if (href && isComposioConnectUrl(href)) {
              return (
                <ConnectButton
                  appName={getConnectAppName(children)}
                  href={href}
                />
              )
            }

            return (
              <a href={href} {...props}>
                {children}
              </a>
            )
          },
        }}
        remarkPlugins={[remarkGfm]}
      >
        {part.text}
      </ReactMarkdown>
    </div>
  )
}

"use client"

import { type ChatUIMessage } from "@/lib/ai/tools"
import { AskUserPart } from "@/components/parts/ask-user-part"
import { DynamicToolPart } from "@/components/parts/dynamic-tool-part"
import { ExaSearchPart } from "@/components/parts/exa-search-part"
import { SourcesPart } from "@/components/parts/sources-part"
import { TextPart } from "@/components/parts/text-part"
import { WebFetchPart } from "@/components/parts/web-fetch-part"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"

export function ChatMessage({
  message,
  isStreaming = false,
}: {
  message: ChatUIMessage
  isStreaming?: boolean
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>
              {message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("")}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message align="start">
      <MessageContent>
        {message.parts.map((part, index) => {
          switch (part.type) {
            case "text":
              return <TextPart key={index} part={part as never} />
            case "tool-ask_user":
              return <AskUserPart key={part.toolCallId} part={part as never} />
            case "tool-exa_search":
              return <ExaSearchPart key={part.toolCallId} part={part as never} />
            case "tool-web_fetch":
              return <WebFetchPart key={part.toolCallId} part={part as never} />
            case "dynamic-tool":
              return <DynamicToolPart key={part.toolCallId} part={part as never} />
            default:
              return null
          }
        })}
        {!isStreaming && <SourcesPart parts={message.parts as never} />}
      </MessageContent>
    </Message>
  )
}

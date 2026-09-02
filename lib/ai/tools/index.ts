import { askUser } from "./ask-user";
import { exaSearchTool } from "./exa-search";
import { webFetchTool } from "./web-fetch";

export function getTools() {
  return {
    ask_user: askUser,
    exa_search: exaSearchTool,
    web_fetch: webFetchTool,
  };
}

export type AppTools = ReturnType<typeof getTools>;

import type { InferUITools, UIDataTypes, UIMessage } from "ai";

export type ChatUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<AppTools>>;

export type ChatMessagePart = ChatUIMessage["parts"][number];

export type TextPart = Extract<ChatMessagePart, { type: "text" }>;
export type SourceUrlPart = Extract<ChatMessagePart, { type: "source-url" }>;
export type ReasoningPart = Extract<ChatMessagePart, { type: "reasoning" }>;

export type AskUserToolPart = Extract<ChatMessagePart, { type: "tool-ask_user" }>;
export type ExaSearchToolPart = Extract<ChatMessagePart, { type: "tool-exa_search" }>;
export type WebFetchToolPart = Extract<ChatMessagePart, { type: "tool-web_fetch" }>;

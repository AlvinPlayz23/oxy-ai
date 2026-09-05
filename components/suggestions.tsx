"use client"

import { Button } from "@/components/ui/button"

const suggestions = [
  {
    label: "Tell me a story",
    prompt:
      "Tell me a short story. Format it in rich markdown: a title heading, a blockquote, a bulleted list, a table, and some bold and italic text.",
  },
  {
    label: "Search the web",
    prompt:
      "Search the web for the latest marketing trends for DTC brands in 2026.",
  },
  {
    label: "Plan a campaign",
    prompt: "Help me plan a marketing campaign for my new product — ask me clarifying questions first, then suggest copy and channels.",
  },
  {
    label: "Ask about Composio",
    prompt: "What marketing integrations are available via Composio? List the apps and how to use them.",
  },
]

export function Suggestions({
  onSelect,
}: {
  onSelect: (prompt: string) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.label}
          variant="outline"
          size="sm"
          className="rounded-full border-border/80 bg-card/80 text-foreground shadow-sm backdrop-blur-sm hover:border-oxy/45 hover:bg-mint-soft"
          onClick={() => onSelect(suggestion.prompt)}
        >
          {suggestion.label}
        </Button>
      ))}
    </div>
  )
}
